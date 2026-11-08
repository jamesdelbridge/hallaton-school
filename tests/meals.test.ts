import assert from "node:assert/strict";
import test from "node:test";
import { cutoffFor, cutoffInstant, mealChangeOpen, mealDate, mealSettingsInput, mealWeekday, ukNow } from "../lib/meals";

test("meal cutoff uses UK local time in winter and summer", () => {
  const settings = { cutoffDays: 1, cutoffTime: "12:00" };
  assert.equal(ukNow(new Date("2027-01-03T11:59:00Z")), "2027-01-03T11:59");
  assert.equal(ukNow(new Date("2027-07-04T10:59:00Z")), "2027-07-04T11:59");
  assert.equal(cutoffFor("2027-07-05", 1, "12:00"), "2027-07-04T12:00");
  assert.equal(mealChangeOpen("2027-07-05", settings, new Date("2027-07-04T10:59:59Z")), true);
  assert.equal(mealChangeOpen("2027-07-05", settings, new Date("2027-07-04T11:00:00Z")), false);
  assert.equal(mealChangeOpen("2027-01-04", settings, new Date("2027-01-03T12:00:00Z")), false);
});

test("clock changes cannot reopen a deadline and skipped times resolve forwards", () => {
  const autumn = { cutoffDays: 0, cutoffTime: "01:30" };
  assert.equal(cutoffInstant("2027-10-31", 0, "01:30").toISOString(), "2027-10-31T00:30:00.000Z");
  assert.equal(mealChangeOpen("2027-10-31", autumn, new Date("2027-10-31T00:29:59Z")), true);
  assert.equal(mealChangeOpen("2027-10-31", autumn, new Date("2027-10-31T01:10:00Z")), false);
  assert.equal(cutoffInstant("2027-03-28", 0, "01:30").toISOString(), "2027-03-28T01:30:00.000Z");
  assert.equal(mealChangeOpen("2027-03-28", autumn, new Date("2027-03-28T01:29:59Z")), true);
  assert.equal(mealChangeOpen("2027-03-28", autumn, new Date("2027-03-28T01:30:00Z")), false);
});

test("meal dates and settings reject invalid or reversed values", () => {
  assert.equal(mealDate.safeParse("2027-02-29").success, false);
  assert.equal(mealDate.safeParse("2028-02-29").success, true);
  assert.equal(mealWeekday("2027-07-05"), 1);
  assert.equal(mealSettingsInput.safeParse({ periodStart: "2027-09-10", periodEnd: "2027-09-01", pricePence: 300, cutoffDays: 1, cutoffTime: "12:00" }).success, false);
  assert.equal(mealSettingsInput.safeParse({ periodStart: "2027-09-01", periodEnd: "2028-07-31", pricePence: 300, cutoffDays: 1, cutoffTime: "24:00" }).success, false);
});
