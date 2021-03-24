"use strict";

const NAT = 0;
const APP = 1;
const ABS = 2;
const SUB = 3;
const ID = 4;
const IDENTITY = Symbol("$identity");
const REDUCE   = Symbol("$reduce");
const builtins = Object.freeze([IDENTITY, REDUCE]);

function parse(template, ...values) {
  let context = new Map();
  let literals = new Map();
  literals.set("$identity", IDENTITY);
  literals.set("$reduce", REDUCE);

  // deal with js literals
  let code = template[0];
  for ( let i=0; i<values.length; i++ ) {
    let placeholder = `\$literal#${i}`;
    literals.set(placeholder, values[i]);
    code += " " + placeholder + " " + template[i+1];
  }

  const parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));
  parser.feed(code);

  function* bound(vari) {
    if ( vari[0] === APP ) {
      yield* bound(vari[1]);
      yield* bound(vari[2]);
    } else if ( vari[0] === ABS ) {
      yield vari[1];
      yield* bound(vari[2]);
    }
  }

  for ( let paragraph of parser.results[0] ) {
    for ( let [sym, vari] of paragraph )
      if ( sym !== "_" )
        context.set(sym, vari);
    for ( let [, vari] of paragraph ) for ( let sym of bound(vari) )
      if ( sym !== "_" && !context.has(sym) )
        context.set(sym, []);

    let variables = new Set(paragraph.map(([sym, vari]) => vari));
    for ( let vari of variables ) {
      if ( vari[0] === NAT ) {
        if ( !literals.has(vari[1]) )
          throw new Error("unknown literal");
        vari[1] = literals.get(vari[1]);

      } else if ( vari[0] === APP ) {
        if ( typeof vari[1] === "string" )
          vari[1] = context.get(vari[1]) || [];
        if ( typeof vari[2] === "string" )
          vari[2] = context.get(vari[2]) || [];

        variables.add(vari[1]);
        variables.add(vari[2]);

      } else if ( vari[0] === ABS ) {
        if ( typeof vari[1] === "string" )
          vari[1] = context.get(vari[1]) || [];
        if ( typeof vari[2] === "string" )
          vari[2] = context.get(vari[2]) || [];

        variables.add(vari[2]);
      }
    }

    for ( let name of context.keys() ) if ( name.startsWith("_") )
      context.delete(name);
  }

  return context;
}

function reduce(vari, logger) {
  let stack = [vari];

  function assign(vari, ...data) {
    vari.splice(0, vari.length, ...data);
  }

  while ( stack.length !== 0 ) {
    vari = stack[stack.length-1];

    logger(...stack);

    switch ( vari[0] ) {
      case undefined:
      case NAT:
      case ABS:
      case ID:
        stack.pop();
        break;

      case APP:
        let [, func, arg] = vari;
        switch ( func[0] ) {
          case undefined:
            throw new Error("undefined variable");
            break;

          case ID:
            // shorten pointer:   ((a) b)  =>  (a b)
            assign(vari, APP, func[1], arg);
            break;

          case ABS:
            // beta-reduction:   ((a : b) c)  =>  ({a -> c} b)
            assign(vari, SUB, [[func[1], arg]], func[2]);
            break;

          case APP:
          case SUB:
            // application of application:   ((a b) c)
            // application of substitution:  (({x -> y} b) c)
            stack.push(func);
            break;

          case NAT:
            switch ( arg[0] ) {
              case undefined:
                throw new Error("undefined variable");
                break;

              case ABS:
                throw new Error("invalid application");
                break;

              case ID:
                // (++ (b))  =>  (++ b)
                assign(vari, APP, func, arg[1]);
                break;

              case APP:
              case SUB:
                // application of application:   (++ (b c))
                // application of substitution:  (++ ({x -> y} c))
                stack.push(arg);
                break;

              case NAT:
                // (++ 2)  =>  3
                assign(vari, NAT, func[1](arg[1]));
                break;
            }
            break;
        }
        break;

      case SUB:
        let [, subs, expr] = vari;
        switch ( expr[0] ) {
          case ID:
            // ({a -> c} (b))  =>  ({a -> c} b)
            assign(vari, SUB, subs, expr[1]);
            break;

          case undefined:
          case NAT:
            // ({a -> c} a)  =>  (c)
            // ({a -> c} b)  =>  (b)
            // ({a -> c} 123)  =>  (123)
            for ( let [key, value] of subs )
              if ( key === expr )
                expr = value;
            assign(vari, ID, expr);
            break;

          case APP:
            // ({a -> c} (b d))  =>  (({a -> c} b) ({a -> c} d))
            let expr1 = [SUB, subs, expr[1]];
            let expr2 = [SUB, subs, expr[2]];
            assign(vari, APP, expr1, expr2);
            break;

          case ABS:
            // ({a -> c} (b : d))  =>  (b' : ({b -> b', a -> c} d))
            let v = [];
            assign(vari, ABS, v, [SUB, [[expr[1], v], ...subs], expr[2]]);
            break;

          case SUB:
            // ({a -> c} ({b -> d} e))  =>  ({b -> d, a -> c} e)
            assign(vari, SUB, [...expr[1], ...subs], expr[2])
            break;
        }
        break;
    }
  }
  return true;
}


function rawLogger(context) {
  let names = new WeakMap();
  for ( let [name, vari] of context.entries() )
    names.set(vari, name);
  let counter = 0;
  function variables(stack) {
    let targets = new Set(stack);
    for ( let vari of targets ) {
      if ( vari[0] === APP || vari[0] === ABS || vari[0] === ID )
        for ( let v of vari.slice(1) )
          targets.add(v);
      if ( vari[0] === SUB ) {
        targets.add(vari[2]);
        for ( let [k, v] of vari[1] ) {
          targets.add(k);
          targets.add(v);
        }
      }
    }
    for ( let vari of targets )
      if ( !names.has(vari) )
        names.set(vari, `_${counter++}`);
    return Array.from(targets).filter(v => v[0] !== undefined);
  }

  function toString(vari) {
    switch ( vari[0] ) {
      case undefined:
        return "";

      case NAT:
        if ( builtins.includes(vari[1]) )
          return `${names.get(vari)} = ${vari[1].description}`;
        else
          return `${names.get(vari)} = \$\{${vari[1]}\}`;

      case ID:
        return `${names.get(vari)} = ${names.get(vari[1])}`;

      case APP:
        return `${names.get(vari)} = ${names.get(vari[1])} ${names.get(vari[2])}`;

      case ABS:
      return `${names.get(vari)} ${names.get(vari[1])} = ${names.get(vari[2])}`;

      case SUB:
        let subs = [];
        for ( let [key, value] of vari[1] )
          subs.push(`${names.get(key)} → ${names.get(value)}`);
        return `${names.get(vari)} = {${subs.join(", ")}} ${names.get(vari[2])}`;
    }
  }

  const PREFIX = "» ";
  const INDENT = "  ";
  return function(...stack) {
    let targets = variables(stack);
    let vari0 = stack[stack.length-1];
    let colors = new Map(stack.map(v => [v, "color:blue"]));
    let str = targets.map(v => `%c${v===vari0 ? PREFIX : INDENT}${toString(v)}`).join("\n");
    let css = targets.map(v => colors.get(v) || "color:reset");
    console.log(str, ...css);
    confirm();
  };
}

function exprLogger(context) {
  let names = new WeakMap();
  for ( let [name, vari] of context.entries() )
    names.set(vari, name);

  let counter = 0;

  function expr(vari, highlight, outers=[]) {
    let str, css = [];
    if ( vari[0] === undefined && !names.has(vari) )
      names.set(vari, `_${counter++}`);

    if ( outers.includes(vari) ) {
      str = "...";

    } else if ( names.has(vari) && outers.length > 0 ) {
      str = names.get(vari);

    } else if ( vari[0] === NAT && builtins.includes(vari[1]) ) {
      str = `${vari[1].description}`;

    } else if ( vari[0] === NAT ) {
      str = `\$\{${vari[1]}\}`;

    } else if ( vari[0] === ID && highlight !== vari[1] ) {
      let [str2, css2] = expr(vari[1], highlight, [vari, ...outers]);
      css.push(...css2);
      str = `(${str2})`;

    } else if ( vari[0] === APP ) {
      let [str1, css1] = expr(vari[1], highlight, [vari, ...outers]);
      let [str2, css2] = expr(vari[2], highlight, [vari, ...outers]);
      css.push(...css1, ...css2);
      str = `(${str1} ${str2})`;

    } else if ( vari[0] === ABS ) {
      let [str1, css1] = expr(vari[1], highlight, [vari, ...outers]);
      let [str2, css2] = expr(vari[2], highlight, [vari, ...outers]);
      css.push(...css1, ...css2);
      str = `(${str1} : ${str2})`;

    } else if ( vari[0] === SUB ) {
      const expr_ = v => expr(v, highlight, [vari, ...outers])[0];
      let subs = [];
      for ( let [k, v] of vari[1] )
        subs.push(`${expr_(k)} → ${expr_(v)}`);
      let subs_str = subs.join(", ");
      let [str1, css1] = expr(vari[2], highlight, [vari, ...outers]);
      css.push(...css1);
      str = `({${subs_str}} ${str1})`;
    }

    if ( highlight === vari ) {
      str = `%c${str}%c`;
      css.unshift("color:blue");
      css.push("color:reset");
    }
    return [str, css];
  }

  return function(...stack) {
    let [str, css] = expr(stack[0], stack[stack.length-1]);
    console.log(str, ...css);
    confirm();
  };
}

// https://omrelli.ug/nearley-playground/
// main    ->  program                               {% id %}
//
// symbol  ->  [^\s\(\)$:=|] [^\s\(\)]:*             {% ([a, b]) => a + b.join("") %}
//         |   [:=|] [^\s\(\)]:+                     {% ([a, b]) => a + b.join("") %}
// literal ->  "$" [^\s\(\)]:+                       {% ([a, b]) => a + b.join("") %}
// _       ->  [^\S\n]:+                             {% a => null %}
//
// expression  ->  constant                          {% id %}
//             |   abstraction                       {% id %}
//             |   application                       {% id %}
//             |   identity                          {% id %}
// atom        ->  symbol                            {% id %}
//             |   constant                          {% id %}
//             |   "(" _:? expression _:? ")"        {% a => a[2] %}
//
// constant    ->  literal                           {% a => [0, a[0]] %}
// identity    ->  symbol                            {% a => [1, 4, a[0]] %}
//             |   "(" _:? expression _:? ")"        {% a => [1, 4, a[2]] %}
// application ->  atom _ atom                       {% a => [1, a[0], a[2]] %}
//             |   application _ atom                {% a => [1, a[0], a[2]] %}
// abstraction ->  symbol _ ":" _ atom               {% a => [2, a[0], a[4]] %}
//             |   symbol _ ":" _ abstraction        {% a => [2, a[0], a[4]] %}
//             |   symbol _ ":" _ application        {% a => [2, a[0], a[4]] %}
//
// declaration     ->  symbol _ "=" _ expression     {% a => [a[0], a[4]] %}
//                 |   symbol _ abstraction_eq       {% a => [a[0], a[2]] %}
// abstraction_eq  ->  symbol _ "=" _ atom           {% a => [2, a[0], a[4]] %}
//                 |   symbol _ "=" _ abstraction    {% a => [2, a[0], a[4]] %}
//                 |   symbol _ "=" _ application    {% a => [2, a[0], a[4]] %}
//                 |   symbol _ abstraction_eq       {% a => [2, a[0], a[2]] %}
//
// comment    ->  "| " [^\n]:*                       {% a => null %}
//            |   "|"                                {% a => null %}
// sentence   ->  _:? comment                        {% a => [] %}
//            |   _:? declaration _:?                {% a => [a[1]] %}
//            |   _:? declaration _ comment          {% a => [a[1]] %}
// paragraph  ->  sentence                           {% a => a[0] %}
//            |   paragraph "\n" sentence            {% a => [...a[0], ...a[2]] %}
// program    ->  [\n]:* paragraph [\n]:*            {% a => [a[1]] %}
//            |   program "\n\n" paragraph [\n]:*    {% a => [...a[0], a[2]] %}
