/** While set, Index keeps showing Login so recovery OTP does not open Dashboard before the new password step. */
export const PASSWORD_RESET_UI_BLOCK_KEY = "sasta_bazar_pw_reset_ui_block";

export function setPasswordResetUiBlock() {
  sessionStorage.setItem(PASSWORD_RESET_UI_BLOCK_KEY, "1");
}

export function clearPasswordResetUiBlock() {
  sessionStorage.removeItem(PASSWORD_RESET_UI_BLOCK_KEY);
}

export function isPasswordResetUiBlocked() {
  return sessionStorage.getItem(PASSWORD_RESET_UI_BLOCK_KEY) === "1";
}
