// Color theme configurations for group pages
// Each theme defines a color palette used throughout the group page

export type ThemeName = 'yellow' | 'royal_blue' | 'cyan' | 'bright_red' | 'maroon' | 'graphite' | 'hot_pink' | 'neon_green' | 'white' | 'rainbow'

export interface ThemeColors {
  primary: string // Main theme color (for buttons, badges)
  primaryLight: string // Lighter variant (for hover states, backgrounds)
  primaryDark: string // Darker variant (for text gradients, borders)
  primaryLighter: string // Very light variant (for subtle backgrounds)
  primaryDarker: string // Very dark variant (for deep gradients)
  backgroundFrom: string // Page background gradient start
  backgroundTo: string // Page background gradient end (should be a lighter shade, not white)
  border: string // Border color
  text: string // Text color for stats/values
  ring: string // Ring color for icons/avatars
  buttonText: 'black' | 'white' // Text color for buttons (white for dark themes)
}

export const GROUP_THEMES: Record<ThemeName, ThemeColors> = {
  yellow: {
    primary: 'rgb(234 179 8)', // yellow-500
    primaryLight: 'rgb(250 204 21)', // yellow-400
    primaryDark: 'rgb(113 63 18)', // yellow-900 (very dark for titles)
    primaryLighter: 'rgb(254 240 138)', // yellow-200
    primaryDarker: 'rgb(161 98 7)', // yellow-700
    backgroundFrom: 'rgb(254 249 195)', // yellow-100
    backgroundTo: 'rgb(254 252 232)', // yellow-50 (very subtle)
    border: 'rgb(254 240 138)', // yellow-200
    text: 'rgb(202 138 4)', // yellow-600
    ring: 'rgb(234 179 8)', // yellow-500
    buttonText: 'black',
  },
  royal_blue: {
    primary: 'rgb(29 78 216)', // blue-700 (deeper, more vibrant for buttons)
    primaryLight: 'rgb(37 99 235)', // blue-600 (for button hover)
    primaryDark: 'rgb(30 58 138)', // blue-900 (very dark for titles)
    primaryLighter: 'rgb(147 197 253)', // blue-300
    primaryDarker: 'rgb(30 64 175)', // blue-800
    backgroundFrom: 'rgb(219 234 254)', // blue-100
    backgroundTo: 'rgb(239 246 255)', // blue-50 (very subtle)
    border: 'rgb(147 197 253)', // blue-300
    text: 'rgb(29 78 216)', // blue-700
    ring: 'rgb(29 78 216)', // blue-700
    buttonText: 'white',
  },
  cyan: {
    primary: 'rgb(6 182 212)', // cyan-500
    primaryLight: 'rgb(34 211 238)', // cyan-400
    primaryDark: 'rgb(8 145 178)', // cyan-600
    primaryLighter: 'rgb(103 232 249)', // cyan-300
    primaryDarker: 'rgb(14 116 144)', // cyan-700
    backgroundFrom: 'rgb(207 250 254)', // cyan-100
    backgroundTo: 'rgb(236 254 255)', // cyan-50 (very subtle)
    border: 'rgb(103 232 249)', // cyan-300
    text: 'rgb(8 145 178)', // cyan-600
    ring: 'rgb(6 182 212)', // cyan-500
    buttonText: 'white',
  },
  bright_red: {
    primary: 'rgb(185 28 28)', // red-700 (deeper, more vibrant for buttons)
    primaryLight: 'rgb(220 38 38)', // red-600 (for button hover)
    primaryDark: 'rgb(127 29 29)', // red-900 (very dark for titles)
    primaryLighter: 'rgb(252 165 165)', // red-300
    primaryDarker: 'rgb(153 27 27)', // red-800
    backgroundFrom: 'rgb(254 226 226)', // red-100
    backgroundTo: 'rgb(255 241 242)', // red-50 (very subtle)
    border: 'rgb(252 165 165)', // red-300
    text: 'rgb(185 28 28)', // red-700
    ring: 'rgb(185 28 28)', // red-700
    buttonText: 'white',
  },
  maroon: {
    primary: 'rgb(128 0 0)', // true maroon
    primaryLight: 'rgb(139 0 0)', // dark red (slightly lighter maroon)
    primaryDark: 'rgb(50 0 0)', // very dark maroon for titles
    primaryLighter: 'rgb(160 82 45)', // saddle brown (brown-red)
    primaryDarker: 'rgb(80 0 0)', // very dark maroon
    backgroundFrom: 'rgb(250 235 215)', // antique white (warm light brown)
    backgroundTo: 'rgb(255 248 240)', // very light warm tint
    border: 'rgb(205 133 63)', // peru (brown-red)
    text: 'rgb(100 0 0)', // dark maroon
    ring: 'rgb(128 0 0)', // maroon
    buttonText: 'white',
  },
  graphite: {
    primary: 'rgb(75 85 99)', // gray-600
    primaryLight: 'rgb(107 114 128)', // gray-500
    primaryDark: 'rgb(17 24 39)', // gray-900 (very dark for titles)
    primaryLighter: 'rgb(156 163 175)', // gray-400
    primaryDarker: 'rgb(31 41 55)', // gray-800
    backgroundFrom: 'rgb(243 244 246)', // gray-100
    backgroundTo: 'rgb(249 250 251)', // gray-50 (very subtle)
    border: 'rgb(209 213 219)', // gray-300
    text: 'rgb(55 65 81)', // gray-700
    ring: 'rgb(75 85 99)', // gray-600
    buttonText: 'white',
  },
  hot_pink: {
    primary: 'rgb(255 105 180)', // hot pink
    primaryLight: 'rgb(255 20 147)', // deep pink
    primaryDark: 'rgb(131 24 67)', // very dark pink/magenta for titles
    primaryLighter: 'rgb(251 182 206)', // pink-300
    primaryDarker: 'rgb(199 21 133)', // medium violet red
    backgroundFrom: 'rgb(253 244 255)', // pink-50
    backgroundTo: 'rgb(255 250 255)', // very light pink (very subtle)
    border: 'rgb(251 182 206)', // pink-300
    text: 'rgb(219 39 119)', // pink-600
    ring: 'rgb(255 105 180)', // hot pink
    buttonText: 'white',
  },
  neon_green: {
    primary: 'rgb(21 128 61)', // green-700 (darker for buttons)
    primaryLight: 'rgb(22 163 74)', // green-600 (darker for button highlights)
    primaryDark: 'rgb(5 46 22)', // very deep green for titles
    primaryLighter: 'rgb(134 239 172)', // green-300
    primaryDarker: 'rgb(20 83 45)', // green-800
    backgroundFrom: 'rgb(220 252 231)', // green-100
    backgroundTo: 'rgb(240 253 244)', // green-50 (very subtle)
    border: 'rgb(134 239 172)', // green-300
    text: 'rgb(21 128 61)', // green-700
    ring: 'rgb(22 163 74)', // green-600
    buttonText: 'white',
  },
  white: {
    primary: 'rgb(234 179 8)', // yellow-500 (for buttons and highlights)
    primaryLight: 'rgb(250 204 21)', // yellow-400
    primaryDark: 'rgb(17 24 39)', // gray-900 (very dark grey for titles)
    primaryLighter: 'rgb(254 240 138)', // yellow-200
    primaryDarker: 'rgb(161 98 7)', // yellow-700
    backgroundFrom: 'rgb(255 255 255)', // white
    backgroundTo: 'rgb(249 250 251)', // gray-50 (very subtle)
    border: 'rgb(229 231 235)', // gray-200
    text: 'rgb(202 138 4)', // yellow-600 (for highlights)
    ring: 'rgb(234 179 8)', // yellow-500
    buttonText: 'black',
  },
  rainbow: {
    primary: 'rgb(147 51 234)', // purple-600 (vibrant purple representing pride)
    primaryLight: 'rgb(168 85 247)', // purple-500
    primaryDark: 'rgb(88 28 135)', // purple-800 (dark for titles)
    primaryLighter: 'rgb(196 181 253)', // purple-300
    primaryDarker: 'rgb(126 34 206)', // purple-700
    backgroundFrom: 'rgb(255 255 255 / 0.9)', // semi-transparent white for cards (works with rainbow background)
    backgroundTo: 'rgb(255 255 255 / 0.95)', // slightly more opaque white
    border: 'rgb(196 181 253)', // purple-300 (subtle rainbow tint)
    text: 'rgb(17 24 39)', // gray-900 (dark for contrast on rainbow background)
    ring: 'rgb(147 51 234)', // purple-600
    buttonText: 'white',
  },
}

export const THEME_NAMES: ThemeName[] = ['white', 'yellow', 'royal_blue', 'cyan', 'bright_red', 'graphite', 'hot_pink', 'neon_green']

export const THEME_DISPLAY_NAMES: Record<ThemeName, string> = {
  yellow: 'Banana',
  royal_blue: 'Neptune',
  cyan: 'Aero',
  bright_red: 'Ruby',
  maroon: 'Maroon',
  graphite: 'Smoky',
  hot_pink: 'Flamingo',
  neon_green: 'Kiwi',
  white: 'Ink & Butter',
  rainbow: 'Pride',
}

