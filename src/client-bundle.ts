// Turns the client modules (already free of types) into one classic inline script. The client
// files only import each other and types, so dropping import lines and `export` keywords and
// wrapping everything in one function scope is a complete bundler for them.

/** Removes ES module syntax from one already type-stripped source file. */
export const stripModuleSyntax = (code: string): string =>
  code
    .replace(/^[ \t]*import\s[\s\S]*?\sfrom\s*["'][^"']+["'];?[ \t]*$/gm, "")
    .replace(/^[ \t]*import\s*["'][^"']+["'];?[ \t]*$/gm, "")
    .replace(/^[ \t]*export\s*\{[^}]*\}(\s*from\s*["'][^"']+["'])?;?[ \t]*$/gm, "")
    .replace(/^([ \t]*)export\s+(?=(?:const|let|var|function|async)\b)/gm, "$1");

/** One IIFE that runs `entry()`; "</script" is escaped so the code can sit inside <script>. */
export const bundleClient = (sources: readonly string[], entry: string): string =>
  `(function(){"use strict";\n${sources.map(stripModuleSyntax).join("\n")}\n${entry}();})();`.replace(
    /<\/script/gi,
    "<\\/script",
  );
