/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

// Mirrors client/src/constants/LabelColors.js. Values come from the .background*
// rules in client/src/styles.module.scss; `silver-glint` and `pirate-gold` are
// gradients there and are flattened to a representative solid color so pdfkit,
// which has no gradient fill, can draw them.
const SERVER_LABEL_COLORS = {
  'muddy-grey': '#69655a',
  'autumn-leafs': '#c9b037',
  'morning-sky': '#52b9d5',
  'antique-blue': '#6c99bb',
  'egg-yellow': '#f9c423',
  'desert-sand': '#fad371',
  'dark-granite': '#8b8680',
  'fresh-salad': '#ced85e',
  'lagoon-blue': '#109dc0',
  'midnight-blue': '#0a63a0',
  'light-orange': '#fdae5f',
  'pumpkin-orange': '#ed9223',
  'light-concrete': '#afb0a4',
  'sunny-grass': '#beca02',
  'navy-blue': '#1d7299',
  'lilac-eyes': '#406cbd',
  'apricot-red': '#fc736c',
  'orange-peel': '#de692f',
  'silver-glint': '#adadad',
  'bright-moss': '#96b352',
  'deep-ocean': '#004c70',
  'summer-sky': '#5d9cec',
  'berry-red': '#e83855',
  'light-cocoa': '#a85540',
  'grey-stone': '#aab2bd',
  'tank-green': '#8aa177',
  'coral-green': '#2b6a6c',
  'sugar-plum': '#7e86c7',
  'pink-tulip': '#e34f7c',
  'shady-rust': '#87564a',
  'wet-rock': '#83949b',
  'wet-moss': '#4a8753',
  'turquoise-sea': '#00858a',
  'lavender-fields': '#b287bd',
  'piggy-red': '#f97394',
  'light-mud': '#c7a57a',
  'gun-metal': '#4f6573',
  'modern-green': '#77ce87',
  'french-coast': '#00b4b1',
  'sweet-lilac': '#975298',
  'red-burgundy': '#ad5f7d',
  'pirate-gold': '#b47e11',
};

const FALLBACK_LABEL_COLOR = '#aab2bd';
const DARK_TEXT = '#1A1A18';
const LIGHT_TEXT = '#FFFFFF';
const LUMINANCE_THRESHOLD = 0.45;

const luminance = (hex) => {
  const c = hex.replace('#', '');
  const channel = (value) => {
    const srgb = parseInt(value, 16) / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  };

  return (
    0.2126 * channel(c.slice(0, 2)) +
    0.7152 * channel(c.slice(2, 4)) +
    0.0722 * channel(c.slice(4, 6))
  );
};

const getLabelColor = (colorName) => SERVER_LABEL_COLORS[colorName] || FALLBACK_LABEL_COLOR;

const textColorFor = (hex) => (luminance(hex) > LUMINANCE_THRESHOLD ? DARK_TEXT : LIGHT_TEXT);

module.exports = {
  SERVER_LABEL_COLORS,
  getLabelColor,
  textColorFor,
};
