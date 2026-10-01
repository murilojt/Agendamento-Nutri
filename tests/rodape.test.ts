import test from "node:test";
import assert from "node:assert/strict";
import { assinaturaValida, comPadrao, dimensoesDaImagem, linhasDoRodape, medidasDaAssinatura, RODAPE_PADRAO } from "../src/lib/rodapePdf.ts";

test("o padrão da clínica gera exatamente as 4 linhas pedidas", () => {
  assert.deepEqual(linhasDoRodape(comPadrao(null)), [
    "Clínica Ayllus | Nutricionista Mariana Fernandes",
    "CRN3 61672",
    "Tel.:(11) 91365-7788",
    "E-mail: nutri.marianafernandes@gmail.com",
  ]);
});

test("valores salvos substituem o padrão; campo nunca salvo (null) usa o padrão; campo apagado ('') some", () => {
  const c = comPadrao({ display_name: "Ana Souza", crn: "CRN3 11111", phone: null, email: "" });
  assert.deepEqual(linhasDoRodape(c), ["Clínica Ayllus | Nutricionista Ana Souza", "CRN3 11111", `Tel.:${RODAPE_PADRAO.phone}`]);
});

test("espaços sobrando são limpos e a primeira linha se adapta quando falta o nome ou a clínica", () => {
  assert.equal(linhasDoRodape({ clinic_name: "  Clínica   Ayllus ", display_name: "", crn: null, phone: null, email: null })[0], "Clínica Ayllus");
  assert.equal(linhasDoRodape({ clinic_name: "", display_name: "Ana", crn: null, phone: null, email: null })[0], "Nutricionista Ana");
  assert.deepEqual(linhasDoRodape({ clinic_name: "", display_name: "", crn: "", phone: "", email: "" }), []);
});

test("assinatura: só PNG/JPEG em data URL e de tamanho limitado", () => {
  assert.equal(assinaturaValida("data:image/png;base64,iVBORw0KGgo="), true);
  assert.equal(assinaturaValida("data:image/jpeg;base64,/9j/4AAQ"), true);
  assert.equal(assinaturaValida("data:image/webp;base64,UklGR"), false);
  assert.equal(assinaturaValida("data:image/svg+xml;base64,PHN2Zz4="), false);
  assert.equal(assinaturaValida("https://exemplo.com/a.png"), false);
  assert.equal(assinaturaValida(null), false);
  assert.equal(assinaturaValida("data:image/png;base64," + "A".repeat(400_000)), false);
});

test("medidas da assinatura mantêm a proporção dentro da caixa", () => {
  assert.deepEqual(medidasDaAssinatura(600, 240), { largura: 130, altura: 52 }); // limitada pela altura (52/240)
  assert.deepEqual(medidasDaAssinatura(300, 60), { largura: 150, altura: 30 }); // limitada pela largura
  assert.deepEqual(medidasDaAssinatura(0, 0), { largura: 150, altura: 52 });
});

// imagens minúsculas de verdade (PNG 120x48 e JPEG 90x36)
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHgAAAAwCAYAAADab77TAAABy0lEQVR42u2cSw4CIRBEhTu49mCez4O59hDjymQykRmgfwVUrY3T4XU1BX7Stm03al5lLgEBUwRMETBFwBQBUwRMETABUwRMEfD98eQ9aLCS1V30Ee7n/Upc7kkc/M+5CG7+1bDSZFlmDz7CXQVytnbvfjRHLWrpuStAzl5w0Z1NwIKFinRxTdONCrmm7mz1IAT3lhZgBsi1WUJ8TGqBu3+tdQPU1IXamFpNaxKyzhYoclT/q2s0J7fCFQNGDVUtdY0A+f54bqVpc7Xm2RuutYt73hMZco9rxYBRx5hkT0WE3OtaEWCNYOK1F0vqioR8NpJNz8HIqVMrD0RDlo5k1ZAlgavpYm0AEZAlQUoFsEVi1oBsNVU8IWu7thnwKMch7do8IFu4tgmw9WjSHNUWjWcFWTNIdQNeIVRFQLYcyUcV76K94bbcU0c1nvS5nmCbQ9Yq+66VkyPgFgFHhKrevdi78XogWwepphEdnZjPRjVSmu/9ONK77hx1YxN9mWHtZAS4lw6OcsixhpHSPFqGyaVCkL/ZgFRbTS2R9SbUf9lBGXEjpHuVYxJV51K0CZiQ/yeLv2+aHPAeNOFODJjiHkwRMAFTBEwRMAWlL7EVurhSbz/VAAAAAElFTkSuQmCC";
const JPG = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAA0JCgsKCA0LCgsODg0PEyAVExISEyccHhcgLikxMC4pLSwzOko+MzZGNywtQFdBRkxOUlNSMj5aYVpQYEpRUk//2wBDAQ4ODhMREyYVFSZPNS01T09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0//wAARCAAkAFoDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD06iisTxPr66LaxpDE099dEpbQqMlm9T7DI+tNJt2QG3RXGaJ/afh3ULWDWruWaDUk5eRsrDckk7M9sg/iRXZ05RsJBRRXD3/iDXNS1O5PhiMSWenr+83R/wCvcMMqPw9Pf1FEYuQN2O4orL8P67aa9YC4tjskXiWFj80beh9vetSk007MYUUUEgAkkADqTSAKKybDxFp2o6rNp9lI0zwruaRVJTOcEbvXp+da1NprcDP1vWLTQ9Pa7vHwBwiD7zt6CsTwrpF1cXR8R60zNfXCnyYiMCBD0GPXH+cmtG+0BdQ8QWuo3dy0tvbL+7tWUbA/97/PcD6VtVV0lZCM/XdLj1jSprJ38tmwY5AOUcchhUHhrVJNT05hdKEvbVzBcp6OO/0PWteuT8SRaho+onWdEtmmM8TRXMSLkFsfJIQOpB4PtRHX3QfcTxXqtzeXa+GdFIN5cr+/l34EKd+nOcfofet/RdKttG0yKytFwqDLHu7dyazfCWhNpVo91enzNSvD5txIQMgnnbn6/rXQUSa+FAu5yXiDQruyvz4g8ODZeLzcW4+7cL349f5/Xrs+H9dtNesBcWx2yLxLC33o29D7ehrUrlda8PXkGqprfhpkivS2J4WOI5gTyT/X/Hq01JWYbG9qmq2OkWpudQuFhjHTPJb6Dqa5Xy9Z8aBvOL6ZohONmP3twOx5HT9PrV3TPC8txeLqviacXt5g7IesUIPOAO+Ofaupouo7bhuVtP0+00y1W2sYEhiXso6n1PqferNFFZjCiiigAooooAKKKKACiiigAooooAKKKKAP/9k=";

test("dimensões lidas do cabeçalho de um PNG e de um JPEG reais", () => {
  assert.deepEqual(dimensoesDaImagem(PNG), { largura: 120, altura: 48 });
  assert.deepEqual(dimensoesDaImagem(JPG), { largura: 90, altura: 36 });
  assert.equal(assinaturaValida(PNG), true);
  assert.equal(assinaturaValida(JPG), true);
  assert.equal(dimensoesDaImagem("data:image/png;base64,AAAA"), null);
  assert.equal(dimensoesDaImagem("lixo"), null);
});
