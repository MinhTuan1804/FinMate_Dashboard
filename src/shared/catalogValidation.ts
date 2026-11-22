export const CATEGORY_SLUG_PATTERN = '[a-z0-9_]+';
export const CATEGORY_SLUG_MAX_LENGTH = 100;
export const CATEGORY_SLUG_HINT = 'Chữ thường không dấu, số và dấu gạch dưới (_), tối đa 100 ký tự.';

/** Matches the system category validator in the backend. */
export function categorySlugError(value: string): string {
  if (!value) return 'Mã danh mục không được để trống.';
  if (value.length > CATEGORY_SLUG_MAX_LENGTH) return 'Mã danh mục tối đa 100 ký tự.';
  if (!/^[a-z0-9_]+$/.test(value)) return 'Mã danh mục chỉ gồm chữ thường, số và dấu gạch dưới (_).';
  return '';
}
