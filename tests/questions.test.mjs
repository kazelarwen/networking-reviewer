import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../src/data/questions.ts", import.meta.url), "utf8");
const javascript = ts.transpile(source, {
  module: ts.ModuleKind.ESNext,
  target: ts.ScriptTarget.ES2022,
});
const { getRandomizedQuestions, isCorrectAnswer, normalizeAnswer, questionBank } = await import(
  `data:text/javascript;base64,${Buffer.from(javascript).toString("base64")}`
);

test("the reviewer has a distinct answer key in every multiple-choice question", () => {
  const ids = questionBank.map((question) => question.id);
  assert.equal(new Set(ids).size, questionBank.length);

  for (const question of questionBank) {
    assert.equal(question.choices.length, 4, `${question.id} should have four choices`);
    assert.equal(new Set(question.choices).size, 4, `${question.id} should not repeat a choice`);
    assert.ok(question.choices.includes(question.answer), `${question.id} should include its answer`);
  }
});

test("identification checking normalizes input and accepts documented aliases", () => {
  const handshake = questionBank.find((question) => question.id === "tcp-handshake");
  assert.ok(handshake);
  assert.equal(normalizeAnswer("  SYN, SYN+ACK, ACK  "), "syn syn ack ack");
  assert.equal(isCorrectAnswer(handshake, "syn syn-ack ack"), true);
  assert.equal(isCorrectAnswer(handshake, ""), false);
  assert.equal(isCorrectAnswer(handshake, "SYN, ACK"), false);
});

test("session selection honors supported round sizes without repeating questions", () => {
  for (const size of [10, 15, 20]) {
    const round = getRandomizedQuestions(size);
    assert.equal(round.length, size);
    assert.equal(new Set(round.map((question) => question.id)).size, size);
  }
});
