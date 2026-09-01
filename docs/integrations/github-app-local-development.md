# Configure the GitHub App locally

Featurewise uses a GitHub App with repository **Contents: read-only** access.
It does not need webhooks, polling, administration access, or write access.

## Create the App

1. In GitHub, create a GitHub App owned by the development account or
   organization.
2. Set the setup URL to the backend callback, for example
   `http://localhost:3000/integrations/github/callback`, and enable the setup
   URL redirect after installation/update.
3. Set the callback URL to the same backend callback.
4. Under repository permissions, grant only **Contents: Read-only**. Leave
   account and organization permissions unset and disable webhooks.
5. Generate a private key and create an OAuth client secret.
6. Install the App on a test account or organization and select the repositories
   that Featurewise may read.

GitHub documents the relevant [permission model](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/choosing-permissions-for-a-github-app),
[installation authentication](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/authenticating-as-a-github-app-installation),
and [setup URL security](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/about-the-setup-url).

## Configure the backend

Copy the backend environment example and set:

```dotenv
GITHUB_ENABLED=true
GITHUB_APP_ID=123456
GITHUB_APP_SLUG=featurewise-local
GITHUB_CLIENT_ID=Iv1.example
GITHUB_CLIENT_SECRET=replace-me
GITHUB_PRIVATE_KEY_BASE64=base64-encoded-pem
GITHUB_CALLBACK_URL=http://localhost:3000/integrations/github/callback
GITHUB_FRONTEND_BASE_URL=http://localhost:5173
```

Encode the complete PEM file, including its header and footer, as base64. The
backend validates every value at startup when GitHub is enabled. Keep the
private key and client secret only in an uncommitted local environment file.

Start PostgreSQL, apply the repository migration to the local development
database through the project's normal Prisma workflow, then start backend and
frontend. Do not apply this migration to an external database as part of local
setup automation.

## Verify the flow

Open a Project's canonical `?tab=repository` URL, select **Connect GitHub**,
install or authorize the App, and select one of the verified repositories after
the callback. A Feature's Repository tab can then inherit the Project branch or
choose an override and select allowed files.

OAuth user tokens and installation access tokens are transient. They must not
appear in the database or logs. Disconnecting a Project removes Featurewise's
current repository configuration and Feature selections; it does not uninstall
the GitHub App from GitHub.
