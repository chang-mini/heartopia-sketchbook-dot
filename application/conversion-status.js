/*
Module: conversion status
Description: Shared status label formatting for conversion lifecycle updates.
Domain: application
Dependencies: none
Usage:
  import { formatConversionStatus } from "./conversion-status.js";
*/

function formatConversionStatus(status) {
  if (status === "queued") return "대기 중";
  if (status === "processing") return "변환 중";
  if (status === "completed") return "완료";
  if (status === "failed") return "실패";
  return status;
}

export { formatConversionStatus };
