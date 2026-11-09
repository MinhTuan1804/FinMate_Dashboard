import assert from 'node:assert/strict';

const origin = process.env.FINMATE_BACKEND_URL || 'http://localhost:8080';
const response = await fetch(`${origin}/swagger/v1/swagger.json`);
assert.equal(response.status, 200, 'Swagger backend phải sẵn sàng');
const swagger = await response.json();
const required = [
  ['post','/api/v1/auth/login'],['post','/api/v1/auth/refresh'],['post','/api/v1/auth/logout'],['post','/api/v1/auth/logout-all'],['post','/api/v1/auth/change-password'],['get','/api/v1/users/me'],
  ['get','/api/v1/admin/users'],['get','/api/v1/admin/users/{id}'],['patch','/api/v1/admin/users/{id}/lock'],['patch','/api/v1/admin/users/{id}/role'],
  ['get','/api/v1/admin/audit-logs'],['get','/api/v1/admin/data-deletion-requests'],['post','/api/v1/admin/data-deletion-requests/{id}/cancel'],
  ['get','/api/v1/admin/categories'],['post','/api/v1/admin/categories'],['patch','/api/v1/admin/categories/{id}/activation'],
  ['get','/api/v1/admin/provider-configs'],['get','/api/v1/admin/finance-methods'],['put','/api/v1/admin/finance-methods/{id}/goal-templates'],
  ['get','/api/v1/admin/goal-templates'],['get','/api/v1/admin/survey-questions'],['post','/api/v1/admin/survey-questions/{id}/options'],
  ['get','/api/v1/admin/ai-stats'],['get','/api/v1/admin/ai-config/documents'],['post','/api/v1/admin/ai-config/documents/{name}/drafts'],
  ['post','/api/v1/admin/ai-config/documents/{name}/versions/{version}/preview'],['post','/api/v1/admin/ai-config/documents/{name}/versions/{version}/activate'],
  ['get','/api/v1/admin/system-config'],['put','/api/v1/admin/system-config'],['get','/api/v1/admin/assumptions'],['post','/api/v1/admin/assumptions'],['post','/api/v1/admin/assumptions/{id}/approve'],['post','/api/v1/admin/assumptions/{id}/retire'],['post','/api/v1/admin/economic-feeds/refresh'],
  ['get','/api/v1/admin/ai-rules/meta'],['get','/api/v1/admin/ai-rules/brands'],['post','/api/v1/admin/ai-rules/keywords'],['post','/api/v1/admin/ai-rules/preview'],
];
for (const [method,path] of required) assert.ok(swagger.paths?.[path]?.[method],`Thiếu ${method.toUpperCase()} ${path}`);
const health = await fetch(`${origin}/health`);
assert.equal(health.status,200,'Backend health phải trả 200');
const protectedResponse = await fetch(`${origin}/api/v1/admin/users?limit=1`);
assert.equal(protectedResponse.status,401,'Admin API phải chặn request không có token');
console.log(`Đạt: ${required.length} endpoint, health và bảo vệ Admin API`);
