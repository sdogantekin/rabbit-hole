// @expo/vector-icons' barrel export (both its "main" and "module" package.json entry points)
// unconditionally requires every icon font family — AntDesign, MaterialCommunityIcons
// (1.3MB alone), Zocial, etc. — as a side effect of the barrel file itself, which Metro
// can't tree-shake even though this app only ever uses Ionicons (verified by exporting the
// bundle and inspecting its assets: ~15MB of unused font files were being bundled).
// Importing the icon set's own file directly bypasses that barrel. Centralized here, rather
// than repeated at each of the app's call sites, since it reaches into the package's
// internal (non-`exports`-mapped) file layout — one place to fix if that ever changes.
export { default as Ionicons } from '@expo/vector-icons/build/Ionicons';
