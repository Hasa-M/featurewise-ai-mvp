#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
aws_profile="${AWS_PROFILE:-featurewise-dev}"
aws_region="${AWS_REGION:-eu-south-1}"
aws_account_id="$(aws --profile "${aws_profile}" sts get-caller-identity --query Account --output text)"
s3_bucket="${S3_BUCKET:-featurewise-dev-${aws_account_id}-${aws_region}}"
temporary_dir="$(mktemp -d)"
trap 'rm -rf "${temporary_dir}"' EXIT

sed "s/__BUCKET__/${s3_bucket}/g" \
  "${script_dir}/bucket-policy.template.json" \
  > "${temporary_dir}/bucket-policy.json"
sed "s/__BUCKET__/${s3_bucket}/g" \
  "${script_dir}/runtime-policy.template.json" \
  > "${temporary_dir}/runtime-policy.json"

if ! aws --profile "${aws_profile}" --region "${aws_region}" \
  s3api head-bucket --bucket "${s3_bucket}" 2>/dev/null; then
  aws --profile "${aws_profile}" --region "${aws_region}" \
    s3api create-bucket \
    --bucket "${s3_bucket}" \
    --create-bucket-configuration "LocationConstraint=${aws_region}"
fi

aws --profile "${aws_profile}" --region "${aws_region}" \
  s3api put-public-access-block \
  --bucket "${s3_bucket}" \
  --public-access-block-configuration \
  'BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true'

aws --profile "${aws_profile}" --region "${aws_region}" \
  s3api put-bucket-ownership-controls \
  --bucket "${s3_bucket}" \
  --ownership-controls 'Rules=[{ObjectOwnership=BucketOwnerEnforced}]'

aws --profile "${aws_profile}" --region "${aws_region}" \
  s3api put-bucket-encryption \
  --bucket "${s3_bucket}" \
  --server-side-encryption-configuration \
  'Rules=[{ApplyServerSideEncryptionByDefault={SSEAlgorithm=AES256},BucketKeyEnabled=false}]'

aws --profile "${aws_profile}" --region "${aws_region}" \
  s3api put-bucket-versioning \
  --bucket "${s3_bucket}" \
  --versioning-configuration Status=Enabled

aws --profile "${aws_profile}" --region "${aws_region}" \
  s3api put-bucket-cors \
  --bucket "${s3_bucket}" \
  --cors-configuration "file://${script_dir}/cors.json"

aws --profile "${aws_profile}" --region "${aws_region}" \
  s3api put-bucket-lifecycle-configuration \
  --bucket "${s3_bucket}" \
  --lifecycle-configuration "file://${script_dir}/lifecycle.json"

aws --profile "${aws_profile}" --region "${aws_region}" \
  s3api put-bucket-policy \
  --bucket "${s3_bucket}" \
  --policy "file://${temporary_dir}/bucket-policy.json"

if [[ -n "${FEATUREWISE_RUNTIME_IAM_USER:-}" ]]; then
  aws --profile "${aws_profile}" iam put-user-policy \
    --user-name "${FEATUREWISE_RUNTIME_IAM_USER}" \
    --policy-name FeaturewiseContextStorage \
    --policy-document "file://${temporary_dir}/runtime-policy.json"
else
  echo "Runtime policy (set FEATUREWISE_RUNTIME_IAM_USER to attach it automatically):"
  sed "s/__BUCKET__/${s3_bucket}/g" "${script_dir}/runtime-policy.template.json"
fi

echo "S3_BUCKET=${s3_bucket}"
echo "AWS_REGION=${aws_region}"
echo "AWS_PROFILE=${aws_profile}"
