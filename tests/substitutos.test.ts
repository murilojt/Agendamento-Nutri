import { test } from "node:test";
import assert from "node:assert/strict";
import { gramasParaMesmasKcal } from "../src/lib/nutricao.ts";

test("gramas para as mesmas calorias", () => {
  // 150 g de arroz (128 kcal/100 g) = 192 kcal -> batata-doce (77 kcal/100 g)
  assert.equal(gramasParaMesmasKcal({ kcal: 77 }, 192), 250);
  assert.equal(gramasParaMesmasKcal({ kcal: 100 }, 100), 100);
  assert.equal(gramasParaMesmasKcal({ kcal: 0 }, 100), null);
  assert.equal(gramasParaMesmasKcal({ kcal: 50 }, 0), null);
  assert.equal(gramasParaMesmasKcal({ kcal: 900 }, 5), 5);
});
