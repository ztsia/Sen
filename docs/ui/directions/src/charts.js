/* Sen's chart palette, one per look. Written by docs/ui/directions/palette.mjs: change the hues there
   and run it again; don't edit this file. build.mjs folds these into each look's tokens. */
'use strict';
const CHART_HUES = [{"slot":1,"name":"Blue","h":268},{"slot":2,"name":"Orchid","h":343},{"slot":3,"name":"Gold","h":93}];
const CHARTS = {
 "minted": {
  "light": {
   "chart-1": "#2a44c4",
   "chart-2": "#d362ab",
   "chart-3": "#ad8d00",
   "chart-seq-1": "#90b7e8",
   "chart-seq-2": "#7096c6",
   "chart-seq-3": "#5176a4",
   "chart-seq-4": "#345783",
   "chart-seq-5": "#173a63"
  },
  "dark": {
   "chart-1": "#577eff",
   "chart-2": "#b74a92",
   "chart-3": "#a28400",
   "chart-seq-1": "#404e5d",
   "chart-seq-2": "#5e6d7d",
   "chart-seq-3": "#7e8d9f",
   "chart-seq-4": "#a0b0c2",
   "chart-seq-5": "#c3d3e6"
  }
 },
 "instrument": {
  "light": {
   "chart-1": "#2942c1",
   "chart-2": "#d060a9",
   "chart-3": "#ab8b00",
   "chart-seq-1": "#afb1b4",
   "chart-seq-2": "#858789",
   "chart-seq-3": "#5d5f61",
   "chart-seq-4": "#383a3c",
   "chart-seq-5": "#17181a"
  },
  "dark": {
   "chart-1": "#5a80ff",
   "chart-2": "#ba4c94",
   "chart-3": "#a58700",
   "chart-seq-1": "#4f4e4a",
   "chart-seq-2": "#73726e",
   "chart-seq-3": "#999994",
   "chart-seq-4": "#c2c1bc",
   "chart-seq-5": "#ecebe6"
  }
 },
 "firefly": {
  "light": {
   "chart-1": "#2943c2",
   "chart-2": "#d261aa",
   "chart-3": "#ac8c00",
   "chart-seq-1": "#a8abf9",
   "chart-seq-2": "#8588d2",
   "chart-seq-3": "#6566ad",
   "chart-seq-4": "#464589",
   "chart-seq-5": "#2a2566"
  },
  "dark": {
   "chart-1": "#557bff",
   "chart-2": "#b54890",
   "chart-3": "#a08300",
   "chart-seq-1": "#4e4e00",
   "chart-seq-2": "#757400",
   "chart-seq-3": "#9d9d2d",
   "chart-seq-4": "#c7c75c",
   "chart-seq-5": "#f2f388"
  }
 },
 "line": {
  "light": {
   "chart-1": "#2a44c4",
   "chart-2": "#d362ab",
   "chart-3": "#ad8d00",
   "chart-seq-1": "#abb3cd",
   "chart-seq-2": "#838ca4",
   "chart-seq-3": "#5e667c",
   "chart-seq-4": "#3b4257",
   "chart-seq-5": "#1b2134"
  },
  "dark": {
   "chart-1": "#577eff",
   "chart-2": "#b74a92",
   "chart-3": "#a28400",
   "chart-seq-1": "#504c42",
   "chart-seq-2": "#746f65",
   "chart-seq-3": "#9a958a",
   "chart-seq-4": "#c2bdb1",
   "chart-seq-5": "#ebe6da"
  }
 },
 "mercury": {
  "light": {
   "chart-1": "#273fbe",
   "chart-2": "#ca5ba4",
   "chart-3": "#a58700",
   "chart-seq-1": "#b2aaa3",
   "chart-seq-2": "#8d8680",
   "chart-seq-3": "#6a635e",
   "chart-seq-4": "#4a433e",
   "chart-seq-5": "#2b2520"
  },
  "dark": {
   "chart-1": "#567dff",
   "chart-2": "#b64991",
   "chart-3": "#a18400",
   "chart-seq-1": "#4f4b45",
   "chart-seq-2": "#706b65",
   "chart-seq-3": "#938e87",
   "chart-seq-4": "#b7b2ac",
   "chart-seq-5": "#ddd8d1"
  }
 },
 "copper": {
  "light": {
   "chart-1": "#273fbf",
   "chart-2": "#cd5ea6",
   "chart-3": "#a78900",
   "chart-seq-1": "#e99b86",
   "chart-seq-2": "#c77c67",
   "chart-seq-3": "#a55d49",
   "chart-seq-4": "#843f2d",
   "chart-seq-5": "#642210"
  },
  "dark": {
   "chart-1": "#5b81ff",
   "chart-2": "#bb4c95",
   "chart-3": "#a68700",
   "chart-seq-1": "#70442d",
   "chart-seq-2": "#8f6149",
   "chart-seq-3": "#b08067",
   "chart-seq-4": "#d2a086",
   "chart-seq-5": "#f5c1a6"
  }
 }
};
const CHART_REPORT = {"minted":{"light":{"ok":true,"cvd":15.2,"normal":24.5,"contrast":[7.44,3.32,3.08],"nearest":{"slot":3,"token":"money-warning","de":14.9,"min":12},"accent":{"contrast":11.12,"fromWarning":26.3,"fromContext":41.2},"seqOk":true},"dark":{"ok":true,"cvd":17,"normal":22.8,"contrast":[4.78,3.61,4.78],"nearest":{"slot":3,"token":"money-warning","de":15.5,"min":12},"accent":{"contrast":11.28,"fromWarning":18.4,"fromContext":38.6},"seqOk":true}},"instrument":{"light":{"ok":true,"cvd":15.1,"normal":24.3,"contrast":[7.4,3.3,3.05],"nearest":{"slot":3,"token":"money-warning","de":15.1,"min":12},"accent":{"contrast":16.55,"fromWarning":32.9,"fromContext":53.4},"seqOk":true},"dark":{"ok":true,"cvd":17.2,"normal":22.6,"contrast":[4.74,3.61,4.81],"nearest":{"slot":3,"token":"money-warning","de":16.1,"min":12},"accent":{"contrast":13.96,"fromWarning":20.3,"fromContext":47.9},"seqOk":true}},"firefly":{"light":{"ok":true,"cvd":15.2,"normal":24.4,"contrast":[7.41,3.29,3.05],"nearest":{"slot":3,"token":"money-warning","de":15.9,"min":12},"accent":{"contrast":12.75,"fromWarning":29.6,"fromContext":43.1},"seqOk":true},"dark":{"ok":true,"cvd":17,"normal":23,"contrast":[4.73,3.59,4.79],"nearest":{"slot":3,"token":"money-warning","de":21.6,"min":12},"accent":{"contrast":14.99,"fromWarning":15.3,"fromContext":50.4},"seqOk":true}},"line":{"light":{"ok":true,"cvd":15.2,"normal":24.5,"contrast":[7.44,3.32,3.08],"nearest":{"slot":3,"token":"money-warning","de":16.1,"min":12},"accent":{"contrast":15.42,"fromWarning":31,"fromContext":51.9},"seqOk":true},"dark":{"ok":true,"cvd":17,"normal":22.8,"contrast":[4.78,3.61,4.78],"nearest":{"slot":3,"token":"money-warning","de":17.3,"min":12},"accent":{"contrast":13.81,"fromWarning":18.1,"fromContext":50.4},"seqOk":true}},"mercury":{"light":{"ok":true,"cvd":14.4,"normal":24.2,"contrast":[7.22,3.31,3.02],"nearest":{"slot":3,"token":"money-warning","de":13.8,"min":12},"accent":{"contrast":13.22,"fromWarning":26.7,"fromContext":46.7},"seqOk":true},"dark":{"ok":true,"cvd":17.1,"normal":22.9,"contrast":[4.79,3.61,4.83],"nearest":{"slot":3,"token":"money-warning","de":17.2,"min":12},"accent":{"contrast":12.3,"fromWarning":15.5,"fromContext":44.6},"seqOk":true}},"copper":{"light":{"ok":true,"cvd":15.1,"normal":24.2,"contrast":[7.46,3.31,3.06],"nearest":{"slot":3,"token":"patina","de":13.7,"min":12},"accent":{"contrast":9.86,"fromWarning":15.5,"fromContext":40},"seqOk":true},"dark":{"ok":true,"cvd":17.2,"normal":22.5,"contrast":[4.72,3.59,4.77],"nearest":{"slot":3,"token":"patina","de":16,"min":12},"accent":{"contrast":4.62,"fromWarning":17.8,"fromContext":18.6},"seqOk":true}}};
if (typeof DIR !== 'undefined' && CHARTS[DIR.id]) for (const m of ['light', 'dark']) Object.assign(DIR.tokens[m], CHARTS[DIR.id][m]);
