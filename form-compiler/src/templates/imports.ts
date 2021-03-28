import { range } from '@thi.ng/transducers';

export const initialComment = '// This file is auto-generated\n';

export const thingImports = {
    paths: (items: string[]) => `import { ${items.join(', ')} } from '@thi.ng/paths';`,
    rstream: (items: string[]) => `import { ${items.join(', ')} } from '@thi.ng/rstream';`,
    transducers: (items: string[]) => `import { ${items.join(', ')} } from '@thi.ng/transducers';`,
}

export const reactImports = (items: string[]) => `import { ${items.join(', ')} } from 'react';`;

export const importStatement = (imports: string[], filename: string, levelFromRoot = 0) => {
    const relativePath = levelFromRoot === 0
        ? './'
        : Array.from(range(levelFromRoot)).reduce((acc, _) => (acc += '../', acc), '');
    return `import { ${imports.join(', ')} } from \'${relativePath}${filename}\';`;
}