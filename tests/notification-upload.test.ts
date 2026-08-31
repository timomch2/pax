import assert from 'node:assert/strict';
import test from 'node:test';
import { renderNotificationTemplate } from '@/lib/notification-service';
import { safeUploadName, validateUploadPolicy } from '@/lib/upload-policy';

test('notification renderer escapes user-controlled HTML', () => {
  const html = renderNotificationTemplate('<p>{{message}}</p>', ['message'], { message: '<img src=x onerror=alert(1)>' });
  assert.equal(html.includes('<img'), false);
  assert.match(html, /&lt;img/);
});

test('notification renderer rejects missing and unresolved variables', () => {
  assert.throws(() => renderNotificationTemplate('{{name}}', ['name'], {}), /Missing notification variable/);
  assert.throws(() => renderNotificationTemplate('{{name}} {{other}}', ['name'], { name: 'PAX' }), /unresolved variable/);
});

test('upload validation enforces purpose type, extension, and size', () => {
  assert.equal(validateUploadPolicy({ purpose: 'TALENT_RESUME', fileName: 'resume.pdf', contentType: 'application/pdf', size: 1024 }), null);
  assert.match(validateUploadPolicy({ purpose: 'TALENT_RESUME', fileName: 'resume.exe', contentType: 'application/octet-stream', size: 1024 }) || '', /type/);
  assert.match(validateUploadPolicy({ purpose: 'PROFILE_IMAGE', fileName: 'photo.png', contentType: 'image/png', size: 6 * 1024 * 1024 }) || '', /size/);
  assert.equal(safeUploadName('../../bad name.pdf').includes(' '), false);
});
