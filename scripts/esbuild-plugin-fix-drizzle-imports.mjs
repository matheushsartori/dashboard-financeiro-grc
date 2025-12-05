// Plugin do esbuild para corrigir imports do drizzle/schema
export const fixDrizzleImports = {
  name: 'fix-drizzle-imports',
  setup(build) {
    build.onResolve({ filter: /^\.\.\/drizzle\/schema$/ }, (args) => {
      return {
        path: args.path.replace(/\.\.\/drizzle\/schema$/, '../drizzle/schema.js'),
        external: true
      };
    });
    build.onResolve({ filter: /^\.\.\/\.\.\/drizzle\/schema$/ }, (args) => {
      return {
        path: args.path.replace(/\.\.\/\.\.\/drizzle\/schema$/, '../../drizzle/schema.js'),
        external: true
      };
    });
  }
};

