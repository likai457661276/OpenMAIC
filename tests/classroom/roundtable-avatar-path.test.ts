import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, test } from 'vitest';

describe('Roundtable teacher avatar path handling', () => {
  test('renders teacher avatars through AvatarDisplay so basePath is applied', () => {
    const source = readFileSync(
      resolve(__dirname, '../../components/roundtable/index.tsx'),
      'utf-8',
    );

    expect(source).not.toMatch(/<img\s+src=\{teacherAvatar\}/);
    expect(
      source.match(/<AvatarDisplay src=\{teacherAvatar\} alt=\{teacherName\} \/>/g),
    ).toHaveLength(2);
  });
});
