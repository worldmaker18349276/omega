// Generated automatically by nearley, version undefined
// http://github.com/Hardmath123/nearley
(function () {
function id(x) { return x[0]; }
var grammar = {
    Lexer: undefined,
    ParserRules: [
    {"name": "program$ebnf$1", "symbols": []},
    {"name": "program$ebnf$1", "symbols": [/[\n]/, "program$ebnf$1"], "postprocess": function arrconcat(d) {return [d[0]].concat(d[1]);}},
    {"name": "program$ebnf$2", "symbols": []},
    {"name": "program$ebnf$2", "symbols": [/[\n]/, "program$ebnf$2"], "postprocess": function arrconcat(d) {return [d[0]].concat(d[1]);}},
    {"name": "program", "symbols": ["program$ebnf$1", "paragraph", "program$ebnf$2"], "postprocess": a => [a[1]]},
    {"name": "program$string$1", "symbols": [{"literal":"\n"}, {"literal":"\n"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "program$ebnf$3", "symbols": []},
    {"name": "program$ebnf$3", "symbols": [/[\n]/, "program$ebnf$3"], "postprocess": function arrconcat(d) {return [d[0]].concat(d[1]);}},
    {"name": "program", "symbols": ["program", "program$string$1", "paragraph", "program$ebnf$3"], "postprocess": a => [...a[0], a[2]]},
    {"name": "paragraph", "symbols": ["sentence"], "postprocess": a => a[0]},
    {"name": "paragraph", "symbols": ["paragraph", {"literal":"\n","pos":39}, "sentence"], "postprocess": a => [...a[0], ...a[2]]},
    {"name": "sentence$ebnf$1", "symbols": ["_"], "postprocess": id},
    {"name": "sentence$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "sentence", "symbols": ["sentence$ebnf$1", "comment"], "postprocess": a => []},
    {"name": "sentence$ebnf$2", "symbols": ["_"], "postprocess": id},
    {"name": "sentence$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "sentence$ebnf$3", "symbols": ["_"], "postprocess": id},
    {"name": "sentence$ebnf$3", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "sentence", "symbols": ["sentence$ebnf$2", "declaration", "sentence$ebnf$3"], "postprocess": a => [a[1]]},
    {"name": "sentence$ebnf$4", "symbols": ["_"], "postprocess": id},
    {"name": "sentence$ebnf$4", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "sentence", "symbols": ["sentence$ebnf$4", "declaration", "_", "comment"], "postprocess": a => [a[1]]},
    {"name": "comment$string$1", "symbols": [{"literal":"|"}, {"literal":" "}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "comment$ebnf$1", "symbols": []},
    {"name": "comment$ebnf$1", "symbols": [/[^\n]/, "comment$ebnf$1"], "postprocess": function arrconcat(d) {return [d[0]].concat(d[1]);}},
    {"name": "comment", "symbols": ["comment$string$1", "comment$ebnf$1"]},
    {"name": "comment", "symbols": [{"literal":"|","pos":92}], "postprocess": a => []},
    {"name": "declaration", "symbols": ["symbol", "_", {"literal":"=","pos":104}, "_", "expression"], "postprocess": a => [a[0], a[4]]},
    {"name": "declaration", "symbols": ["symbol", "_", "abstraction_eq"], "postprocess": a => [a[0], a[2]]},
    {"name": "abstraction_eq", "symbols": ["symbol", "_", {"literal":"=","pos":130}, "_", "atom"], "postprocess": a => [2, a[0], a[4]]},
    {"name": "abstraction_eq", "symbols": ["symbol", "_", {"literal":"=","pos":144}, "_", "abstraction"], "postprocess": a => [2, a[0], a[4]]},
    {"name": "abstraction_eq", "symbols": ["symbol", "_", {"literal":"=","pos":158}, "_", "application"], "postprocess": a => [2, a[0], a[4]]},
    {"name": "abstraction_eq", "symbols": ["symbol", "_", "abstraction_eq"], "postprocess": a => [2, a[0], a[2]]},
    {"name": "parentheses$ebnf$1", "symbols": ["_"], "postprocess": id},
    {"name": "parentheses$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "parentheses$ebnf$2", "symbols": ["_"], "postprocess": id},
    {"name": "parentheses$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "parentheses", "symbols": [{"literal":"(","pos":180}, "parentheses$ebnf$1", "expression", "parentheses$ebnf$2", {"literal":")","pos":190}], "postprocess": a => a[2]},
    {"name": "expression", "symbols": ["constant"], "postprocess": id},
    {"name": "expression", "symbols": ["abstraction"], "postprocess": id},
    {"name": "expression", "symbols": ["application"], "postprocess": id},
    {"name": "expression", "symbols": ["identity"], "postprocess": id},
    {"name": "atom", "symbols": ["symbol"], "postprocess": id},
    {"name": "atom", "symbols": ["constant"], "postprocess": id},
    {"name": "atom", "symbols": ["parentheses"], "postprocess": id},
    {"name": "constant", "symbols": ["literal"], "postprocess": a => [0, a[0]]},
    {"name": "identity", "symbols": ["symbol"], "postprocess": a => [1, "id", a[0]]},
    {"name": "identity", "symbols": ["parentheses"], "postprocess": a => [1, "id", a[0]]},
    {"name": "application", "symbols": ["atom", "_", "atom"], "postprocess": a => [1, a[0], a[2]]},
    {"name": "application", "symbols": ["application", "_", "atom"], "postprocess": a => [1, a[0], a[2]]},
    {"name": "abstraction", "symbols": ["symbol", "_", {"literal":":","pos":292}, "_", "atom"], "postprocess": a => [2, a[0], a[4]]},
    {"name": "abstraction", "symbols": ["symbol", "_", {"literal":":","pos":306}, "_", "abstraction"], "postprocess": a => [2, a[0], a[4]]},
    {"name": "abstraction", "symbols": ["symbol", "_", {"literal":":","pos":320}, "_", "application"], "postprocess": a => [2, a[0], a[4]]},
    {"name": "symbol$ebnf$1", "symbols": []},
    {"name": "symbol$ebnf$1", "symbols": [/[^\s\(\)]/, "symbol$ebnf$1"], "postprocess": function arrconcat(d) {return [d[0]].concat(d[1]);}},
    {"name": "symbol", "symbols": [/[^\s\(\)$:=|]/, "symbol$ebnf$1"], "postprocess": ([a, b]) => a + b.join("")},
    {"name": "symbol$ebnf$2", "symbols": [/[^\s\(\)]/]},
    {"name": "symbol$ebnf$2", "symbols": [/[^\s\(\)]/, "symbol$ebnf$2"], "postprocess": function arrconcat(d) {return [d[0]].concat(d[1]);}},
    {"name": "symbol", "symbols": [/[:=|]/, "symbol$ebnf$2"], "postprocess": ([a, b]) => a + b.join("")},
    {"name": "literal$ebnf$1", "symbols": [/[^\s\(\)]/]},
    {"name": "literal$ebnf$1", "symbols": [/[^\s\(\)]/, "literal$ebnf$1"], "postprocess": function arrconcat(d) {return [d[0]].concat(d[1]);}},
    {"name": "literal", "symbols": [{"literal":"$","pos":352}, "literal$ebnf$1"], "postprocess": ([a, b]) => a + b.join("")},
    {"name": "_$ebnf$1", "symbols": [/[^\S\n]/]},
    {"name": "_$ebnf$1", "symbols": [/[^\S\n]/, "_$ebnf$1"], "postprocess": function arrconcat(d) {return [d[0]].concat(d[1]);}},
    {"name": "_", "symbols": ["_$ebnf$1"], "postprocess": a => null}
]
  , ParserStart: "program"
}
if (typeof module !== 'undefined'&& typeof module.exports !== 'undefined') {
   module.exports = grammar;
} else {
   window.grammar = grammar;
}
})();
