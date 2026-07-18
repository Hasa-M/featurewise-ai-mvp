import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, type SubmitHandler } from 'react-hook-form';

import { ApiError } from '@/shared/api';
import { Button } from '@/shared/ui/button';
import { TextInput } from '@/shared/ui/text-input';

import {
  loginFormSchema,
  type LoginFormValues,
} from '../lib/login-form-schema';
import { useAuth } from '../model/use-auth';
import styles from './LoginForm.module.css';

function getSignInError(cause: unknown): string {
  return cause instanceof ApiError && cause.status === 401
    ? 'Invalid username or password.'
    : 'Unable to sign in. Check that the backend is running and try again.';
}

export function LoginForm() {
  const { signIn } = useAuth();
  const {
    clearErrors,
    control,
    formState: { errors, isSubmitting, isValid },
    handleSubmit,
    setError,
  } = useForm<LoginFormValues>({
    defaultValues: {
      password: '',
      username: '',
    },
    mode: 'onChange',
    resolver: zodResolver(loginFormSchema),
  });

  const submitLogin: SubmitHandler<LoginFormValues> = async (values) => {
    clearErrors('root');

    try {
      await signIn(values);
    } catch (cause: unknown) {
      setError('root', {
        message: getSignInError(cause),
        type: 'server',
      });
    }
  };

  return (
    <form
      className={styles.form}
      noValidate
      onSubmit={handleSubmit(submitLogin)}
    >
      <Controller
        control={control}
        name={'username'}
        render={({ field, fieldState }) => (
          <TextInput
            autoComplete={'username'}
            autoFocus
            disabled={isSubmitting}
            errorMessage={fieldState.error?.message}
            label={'Username'}
            maxLength={100}
            name={field.name}
            onBlur={field.onBlur}
            onChange={(event) => {
              clearErrors('root');
              field.onChange(event);
            }}
            placeholder={'Enter your username'}
            required
            value={field.value}
          />
        )}
      />
      <Controller
        control={control}
        name={'password'}
        render={({ field, fieldState }) => (
          <TextInput
            autoComplete={'current-password'}
            disabled={isSubmitting}
            errorMessage={fieldState.error?.message}
            label={'Password'}
            maxLength={1000}
            name={field.name}
            onBlur={field.onBlur}
            onChange={(event) => {
              clearErrors('root');
              field.onChange(event);
            }}
            required
            value={field.value}
            valueType={'password'}
          />
        )}
      />
      {errors.root?.message ? (
        <p className={styles.error} role={'alert'}>
          {errors.root.message}
        </p>
      ) : null}
      <Button
        className={styles.submitButton}
        disabled={!isValid || errors.root !== undefined || isSubmitting}
        loading={isSubmitting}
        size={'large'}
        type={'submit'}
      >
        Sign in
      </Button>
    </form>
  );
}
