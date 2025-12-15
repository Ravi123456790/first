export type DataType =
  | 'user_email'
  | 'user_password'
  | 'user_2fa_code'
  | 'user_phone_number'
  | 'user_verification_codes';

export type LiveData = Partial<Record<DataType, string>>;


