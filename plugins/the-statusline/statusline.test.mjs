import {expect, test} from 'vite-plus/test';
import {collapsePath} from './statusline.js';

test('keeps the root of an absolute path at every collapse stage', () => {
	const dir = '/opt/some/deeply/nested/working/directory';

	expect(collapsePath(dir, 30)).toBe('/o/s/d/n/working/directory');
	expect(collapsePath(dir, 12)).toBe('/o/.../directory');
});
