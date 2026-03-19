/*
Module: palette groups
Description: Palette grouping and ordering helpers.
Domain: domain/palette
Dependencies: ../../config/app-constants.js
Usage:
  import { buildPaletteGroups, getPaletteCodeOrder } from "./groups.js";
*/

import { GROUP_DISPLAY_ORDER, GROUP_MAIN_COLORS } from "../../config/app-constants.js";

function buildPaletteGroups(items) {
  const map = new Map();

  items.forEach((item) => {
    if (!map.has(item.group)) {
      map.set(item.group, {
        name: item.group,
        items: [],
        totalCount: 0,
        mainColor: GROUP_MAIN_COLORS[item.group] || item.hex_value,
      });
    }
    const group = map.get(item.group);
    group.items.push(item);
    group.totalCount += Number(item.count || 0);
  });

  map.forEach((group) => {
    group.items.sort((left, right) => getPaletteCodeOrder(left.code) - getPaletteCodeOrder(right.code));
  });

  return [...map.values()].sort(
    (left, right) => GROUP_DISPLAY_ORDER.indexOf(left.name) - GROUP_DISPLAY_ORDER.indexOf(right.name),
  );
}

function getPaletteCodeOrder(code) {
  const match = /^([A-Za-z]+)(\d+)$/.exec(code || "");
  if (!match) {
    return Number.MAX_SAFE_INTEGER;
  }

  const [, prefix, numberPart] = match;
  const groupName = getPaletteGroupNameFromCodePrefix(prefix);
  const groupIndex = GROUP_DISPLAY_ORDER.indexOf(groupName);
  return (Math.max(groupIndex, 0) * 100) + Number(numberPart);
}

function getPaletteGroupNameFromCodePrefix(prefix) {
  const prefixMap = {
    B: "Black",
    Re: "Red",
    Or: "Orange",
    Am: "Amber",
    Ye: "Yellow",
    Pi: "Pistachio",
    Gr: "Green",
    Aq: "Aqua",
    Bl: "Blue",
    In: "Indigo",
    Pu: "Purple",
    Ma: "Magenta",
    P: "Pink",
  };

  return prefixMap[prefix] || "";
}

export {
  buildPaletteGroups,
  getPaletteCodeOrder,
  getPaletteGroupNameFromCodePrefix,
};
