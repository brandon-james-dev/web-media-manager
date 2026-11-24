/** A third-party package the application ships, credited in the about dialog. */
export interface OssCredit {
  name: string;
  license: string;
  url: string;
}

/** Runtime dependencies from package.json, alphabetical by package name. */
export const OSS_CREDITS: readonly OssCredit[] = [
  { name: "@base-ui/react", license: "MIT", url: "https://base-ui.com" },
  {
    name: "@dnd-kit/core",
    license: "MIT",
    url: "https://github.com/clauderic/dnd-kit",
  },
  {
    name: "@dnd-kit/sortable",
    license: "MIT",
    url: "https://github.com/clauderic/dnd-kit",
  },
  {
    name: "@fontsource-variable/geist",
    license: "OFL-1.1",
    url: "https://fontsource.org/fonts/geist",
  },
  {
    name: "@tailwindcss/container-queries",
    license: "MIT",
    url: "https://github.com/tailwindlabs/tailwindcss-container-queries",
  },
  {
    name: "@tailwindcss/vite",
    license: "MIT",
    url: "https://tailwindcss.com",
  },
  {
    name: "@tanstack/react-query",
    license: "MIT",
    url: "https://tanstack.com/query",
  },
  {
    name: "@tanstack/react-table",
    license: "MIT",
    url: "https://tanstack.com/table",
  },
  {
    name: "@tanstack/react-virtual",
    license: "MIT",
    url: "https://tanstack.com/virtual",
  },
  { name: "@thesvg/react", license: "MIT", url: "https://thesvg.org" },
  {
    name: "class-variance-authority",
    license: "Apache-2.0",
    url: "https://github.com/joe-bell/cva",
  },
  { name: "clsx", license: "MIT", url: "https://github.com/lukeed/clsx" },
  { name: "cmdk", license: "MIT", url: "https://github.com/pacocoursey/cmdk" },
  { name: "cn", license: "MIT", url: "https://github.com/shadcn-ui/cn" },
  { name: "dexie", license: "Apache-2.0", url: "https://dexie.org" },
  {
    name: "embla-carousel-react",
    license: "MIT",
    url: "https://www.embla-carousel.com",
  },
  { name: "fflate", license: "MIT", url: "https://github.com/101arrowz/fflate" },
  {
    name: "itunesdb-ts",
    license: "MIT",
    url: "https://github.com/brandon-james-dev/itunesdb-ts",
  },
  { name: "lucide-react", license: "ISC", url: "https://lucide.dev" },
  {
    name: "motion",
    license: "MIT",
    url: "https://github.com/motiondivision/motion",
  },
  { name: "react", license: "MIT", url: "https://react.dev" },
  { name: "react-dom", license: "MIT", url: "https://react.dev" },
  {
    name: "react-router",
    license: "MIT",
    url: "https://github.com/remix-run/react-router",
  },
  { name: "rxjs", license: "Apache-2.0", url: "https://rxjs.dev" },
  { name: "saxes", license: "ISC", url: "https://github.com/lddubeau/saxes" },
  {
    name: "sharp",
    license: "Apache-2.0",
    url: "https://sharp.pixelplumbing.com",
  },
  { name: "sonner", license: "MIT", url: "https://sonner.emilkowal.ski" },
  {
    name: "sucrase",
    license: "MIT",
    url: "https://github.com/alangpierce/sucrase",
  },
  {
    name: "taglib-wasm",
    license: "MIT",
    url: "https://github.com/CharlesWiltgen/TagLib-Wasm",
  },
  {
    name: "tailwind-merge",
    license: "MIT",
    url: "https://github.com/dcastil/tailwind-merge",
  },
  {
    name: "tw-animate-css",
    license: "MIT",
    url: "https://github.com/Wombosvideo/tw-animate-css",
  },
  {
    name: "use-fs-access",
    license: "MIT",
    url: "https://github.com/Milan-Kovacevic/use-fs-access",
  },
  { name: "uuidv7", license: "Apache-2.0", url: "https://github.com/LiosK/uuidv7" },
  {
    name: "zunesync-ts",
    license: "MIT",
    url: "https://github.com/brandon-james-dev/zunesync-ts",
  },
];
