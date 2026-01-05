import { registerPlugin } from '@capacitor/core';

export interface CredentialSignInResult {
  idToken?: string;
}

export interface GoogleCredentialOptions {
  webClientId: string;
}

export const GoogleCredentialAuth = registerPlugin<
  { signIn(options: GoogleCredentialOptions): Promise<CredentialSignInResult>; }
>('GoogleCredentialAuth');

