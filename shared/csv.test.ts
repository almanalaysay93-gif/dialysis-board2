import { describe, expect, it } from "vitest";
import { csvDate, csvField, toCsv } from "./csv";

describe("csvField", () => {
  it("leaves ordinary values unquoted", () => {
    expect(csvField("HD-01")).toBe("HD-01");
    expect(csvField(42)).toBe("42");
  });

  it("returns an empty string for null and undefined", () => {
    expect(csvField(null)).toBe("");
    expect(csvField(undefined)).toBe("");
  });

  it("quotes fields containing a comma", () => {
    // Patient display labels are free text and routinely contain commas.
    expect(csvField("Dela Cruz, Juan")).toBe('"Dela Cruz, Juan"');
  });

  it("quotes and doubles embedded quotes", () => {
    expect(csvField('Nurse "Bok" Reyes')).toBe('"Nurse ""Bok"" Reyes"');
  });

  it("quotes fields containing newlines", () => {
    expect(csvField("line1\nline2")).toBe('"line1\nline2"');
    expect(csvField("line1\r\nline2")).toBe('"line1\r\nline2"');
  });
});

describe("csvDate", () => {
  it("formats in local time, zero padded", () => {
    // Constructed from local parts so the assertion is timezone independent.
    expect(csvDate(new Date(2026, 7, 22, 9, 5))).toBe("2026-08-22 09:05");
    expect(csvDate(new Date(2026, 11, 1, 23, 59))).toBe("2026-12-01 23:59");
  });

  it("returns an empty string for a missing date", () => {
    expect(csvDate(null)).toBe("");
    expect(csvDate(undefined)).toBe("");
  });
});

describe("toCsv", () => {
  it("joins rows with CRLF and escapes each field", () => {
    const csv = toCsv([
      ["Session ID", "Patient ID", "Nurse"],
      [7, "PT-1", "Dela Cruz, Juan"],
    ]);
    expect(csv).toBe('Session ID,Patient ID,Nurse\r\n7,PT-1,"Dela Cruz, Juan"');
  });

  it("keeps column counts stable when values are missing", () => {
    const csv = toCsv([["a", "b", "c"], [1, null, undefined]]);
    expect(csv.split("\r\n")[1]).toBe("1,,");
  });
});
