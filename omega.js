"use strict";

const NAT = 0;
const APP = 1;
const ABS = 2;
const IDENTITY = Symbol("$identity");
const REDUCE   = Symbol("$reduce");
const builtins = Object.freeze([IDENTITY, REDUCE]);

function parse(template, ...values) {
  let context = new Map();
  let literals = new Map();
  literals.set("$identity", IDENTITY);
  literals.set("$reduce", REDUCE);

  // deal with literals
  let code = template[0];
  for ( let i=0, counter=0; i<values.length; i++ ) {
    if ( !/(^|\s|\()$/.test(template[i]) || !/^(\)|\s|$)/.test(template[i+1]) ) {
      throw new Error("invalid syntax");
    }
    let placeholder = `\$literal#${counter++}`;
    literals.set(placeholder, values[i]);
    code += placeholder + template[i+1];
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

  function bind(vari) {
    if ( vari[0] === NAT ) {
      if ( !literals.has(vari[1]) ) {
        throw new Error("unknown literal");
      }
      vari[1] = literals.get(vari[1]);

    } else if ( vari[0] === APP ) {
      if ( typeof vari[1] !== "string" ) {
        bind(vari[1]);
      } else {
        vari[1] = context.get(vari[1]) || [];
      }

      if ( typeof vari[2] !== "string" ) {
        bind(vari[2]);
      } else {
        vari[2] = context.get(vari[2]) || [];
      }

    } else if ( vari[0] === ABS ) {
      vari[1] = context.get(vari[1]) || [];

      if ( typeof vari[2] !== "string" ) {
        bind(vari[2]);
      } else {
        vari[2] = context.get(vari[2]) || [];
      }
    }
  }

  for ( let paragraph of parser.results[0] ) {
    for ( let [sym, vari] of paragraph ) {
      context.set(sym, vari);
    }
    for ( let [,vari] of paragraph ) for ( let sym of bound(vari) ) if ( sym !== "_" ) {
      if ( !context.has(sym) ) {
        context.set(sym, []);
      } else if ( context.get(sym)[0] !== undefined ) {
        throw new Error("rebind variable");
      }
    }

    for ( let [,vari] of paragraph ) {
      bind(vari);
    }

    for ( let name of context.keys() ) if ( name.startsWith("_") ) {
      context.delete(name);
    }
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

    if ( logger && vari[0] !== undefined ) {
      logger(...stack);
    }

    if ( vari[0] === undefined ) {
      throw new Error("undefined variable");
    } else if ( vari[0] === NAT || vari[0] === ABS ) {
      stack.pop();
      continue;
    }

    let func = vari[1];
    let arg = vari[2];

    if ( func[0] === APP ) {
      // application of application:   ((a b) c)
      stack.push(func);
      continue;

    } else if ( func[0] === ABS && func[1] === func[2] ) {
      // beta-reduction for lambda function:   ((a : a) c)  =>  (c)
      assign(vari, APP, [NAT, IDENTITY], arg);
      continue;

    } else if ( func[0] === ABS && func[2][0] === ABS && func[1] === func[2][1] ) {
      // beta-reduction for lambda function:   ((a : (a : b)) c)  =>  (a : b)
      assign(vari, ...func[2]);
      continue;

    } else if ( func[0] === ABS && func[2][0] === ABS ) {
      // beta-reduction for lambda function:   ((a : (b : d)) c)  =>  (b : ((a : d) c))
      let arg1 = func[1];
      let arg2 = func[2][1];
      let res = func[2][2];
      let func_ = [ABS, arg1, res];
      let res_ = [APP, func_, arg];
      assign(vari, ABS, arg2, res_);
      continue;

    } else if ( func[0] === ABS && func[2][0] === APP ) {
      // beta-reduction for lambda function:   ((a : (b d)) c)  =>  (((a : b) c) ((a : d) c))
      let arg0 = func[1];
      let res1 = func[2][1];
      let res2 = func[2][2];
      let func1 = [ABS, arg0, res1];
      let func2 = [ABS, arg0, res2];
      let res1_ = [APP, func1, arg];
      let res2_ = [APP, func2, arg];
      assign(vari, APP, res1_, res2_);
      continue;

    } else if ( func[0] === NAT && func[1] === IDENTITY && stack.length > 1 ) {
      // shorten pointer:   ((a) b)  =>  (a b)
      stack.pop();
      vari = stack[stack.length-1];
      assign(vari, APP, arg, vari[2]);
      continue;
    }

    // strict evaluation

    let whnf = true;
    if ( arg[0] === APP ) {
      whnf = reduce(arg, logger && ((...vs) => logger(...stack, ...vs)));
    }
    if ( !whnf ) {
      return false;
    }

    // shorten pointer:   (++ (b))  =>  (++ b)
    if ( arg[0] === APP && arg[1][0] === NAT && arg[1][1] === IDENTITY ) {
      arg = arg[2];
      assign(vari, APP, func, arg);
      if ( logger ) logger(...stack);
    }

    if ( func[0] === NAT && func[1] === IDENTITY ) { // stack.length === 1
      if ( arg[0] === NAT ) {
        // (id 1)  =>  1
        assign(vari, NAT, arg[1]);
      } else if ( arg[0] === ABS ) {
        // (id (a : c))  =>  (a : c)
        assign(vari, ABS, arg[1], arg[2]);
      }

    } else if ( func[0] === NAT && func[1] === REDUCE ) {
      assign(vari, NAT, IDENTITY);

    } else {
      assign(vari, NAT, func[1](arg[1]));
    }

    if ( logger ) logger(...stack);
    stack.pop();
  }

  return true;
}

class RawLogger
{
  constructor(context) {
    this.names = new WeakMap();
    this.counter = 0;
    for ( let [name, vari] of context.entries() ) {
      this.names.set(vari, name);
    }

    this.prefix = "» ";
    this.indent = "  ";
  }

  variables(vari, out=[]) {
    if ( out.includes(vari) ) {
      return out;
    }
    if ( vari[0] === NAT ) {
      out.push(vari);
    } else if ( vari[0] === APP ) {
      out.push(vari);
      this.variables(vari[1], out);
      this.variables(vari[2], out);
    } else if ( vari[0] === ABS ) {
      out.push(vari);
      if ( !out.includes(vari[1]) ) {
        out.push(vari[1]);
      }
      this.variables(vari[2], out);
    }
    return out;
  }
  sentence(vari) {
    let vari_name = this.names.get(vari);
    if ( vari[0] === undefined ) {
      return "";

    } else if ( vari[0] === NAT && builtins.includes(vari[1]) ) {
      return `${vari_name} = ${vari[1].description}`;

    } else if ( vari[0] === NAT ) {
      return `${vari_name} = \$\{${vari[1]}\}`;

    } else if ( vari[0] === APP ) {
      let func_name = this.names.get(vari[1]);
      let arg_name = this.names.get(vari[2]);
      return `${vari_name} = ${func_name} ${arg_name}`;

    } else if ( vari[0] === ABS ) {
      let arg_name = this.names.get(vari[1]);
      let res_name = this.names.get(vari[2]);
      return `${vari_name} ${arg_name} = ${res_name}`;
    }
  }
  log(...stack) {
    let targets = [];
    for ( let vari of stack ) {
      this.variables(vari, targets);
    }
    for ( let target of targets ) if ( !this.names.has(target) ) {
      this.names.set(target, `_${this.counter++}`);
    }
    targets = targets.filter(v => v[0] !== undefined);

    let vari0 = stack[stack.length-1];
    let colors = new Map(stack.map(v => [v, "color:blue"]));
    let str = targets.map(v => `%c${v===vari0 ? this.prefix : this.indent}${this.sentence(v)}`).join("\n");
    let css = targets.map(v => colors.get(v) || "color:reset");
    console.log(str, ...css);
  }
}

class ExprLogger
{
  constructor(context) {
    this.names = new WeakMap();
    this.counter = 0;
    for ( let [name, vari] of context.entries() ) {
      this.names.set(vari, name);
    }
  }

  expr(vari, highlight, outers=[]) {
    let expr, css = [];
    if ( vari[0] === undefined && !this.names.has(vari) ) {
      this.names.set(vari, `_${this.counter++}`);
    }

    if ( outers.includes(vari) ) {
      expr = "...";

    } else if ( this.names.has(vari) && outers.length > 0 ) {
      expr = this.names.get(vari);

    } else if ( vari[0] === NAT && builtins.includes(vari[1]) ) {
      expr = `${vari[1].description}`;

    } else if ( vari[0] === NAT ) {
      expr = `\$\{${vari[1]}\}`;

    } else if ( vari[0] === APP && vari[1][0] === NAT && vari[1][1] === IDENTITY && highlight !== vari[1] ) {
      let [arg, css1] = this.expr(vari[2], highlight, [vari, ...outers]);
      css.push(...css1);
      expr = `(${arg})`;

    } else if ( vari[0] === APP ) {
      let [func, css1] = this.expr(vari[1], highlight, [vari, ...outers]);
      let [arg, css2] = this.expr(vari[2], highlight, [vari, ...outers]);
      css.push(...css1, ...css2);
      expr = `(${func} ${arg})`;

    } else if ( vari[0] === ABS ) {
      let [arg, css1] = this.expr(vari[1], highlight, [vari, ...outers]);
      let [res, css2] = this.expr(vari[2], highlight, [vari, ...outers]);
      css.push(...css1, ...css2);
      expr = `(${arg} : ${res})`;
    }

    if ( highlight === vari ) {
      expr = `%c${expr}%c`;
      css.unshift("color:blue");
      css.push("color:reset");
    }
    return [expr, css];
  }
  log(...stack) {
    let [str, css] = this.expr(stack[0], stack[stack.length-1]);
    console.log(str, ...css);
  }
}

// https://omrelli.ug/nearley-playground/
// program    ->  [\n]:* paragraph [\n]:*            {% a => [a[1]] %}
//            |   program "\n\n" paragraph [\n]:*    {% a => [...a[0], a[2]] %}
// paragraph  ->  sentence                           {% a => a[0] %}
//            |   paragraph "\n" sentence            {% a => [...a[0], ...a[2]] %}
// sentence   ->  _:? comment                        {% a => [] %}
//            |   _:? declaration _:?                {% a => [a[1]] %}
//            |   _:? declaration _ comment          {% a => [a[1]] %}
// comment    ->  "| " [^\n]:* | "|"                 {% a => [] %}
// 
// declaration     ->  symbol _ "=" _ expression     {% a => [a[0], a[4]] %}
//                 |   symbol _ abstraction_eq       {% a => [a[0], a[2]] %}
// abstraction_eq  ->  scoped _ "=" _ atom           {% a => [2, a[0], a[4]] %}
//                 |   scoped _ "=" _ abstraction    {% a => [2, a[0], a[4]] %}
//                 |   scoped _ "=" _ application    {% a => [2, a[0], a[4]] %}
//                 |   scoped _ abstraction_eq       {% a => [2, a[0], a[2]] %}
// 
// parentheses ->  "(" _:? expression _:? ")"  {% a => a[2] %}
// expression  ->  constant       {% id %}
//             |   abstraction    {% id %}
//             |   application    {% id %}
//             |   identity       {% id %}
// atom        ->  symbol         {% id %}
//             |   constant       {% id %}
//             |   parentheses    {% id %}
// 
// constant    ->  literal                             {% a => [0, a[0]] %}
// identity    ->  symbol                              {% a => [1, "id", a[0]] %}
//             |   parentheses                         {% a => [1, "id", a[0]] %}
// application ->  atom _ atom                         {% a => [1, a[0], a[2]] %}
//             |   application _ atom                  {% a => [1, a[0], a[2]] %}
// abstraction ->  scoped _ ":" _ atom                 {% a => [2, a[0], a[4]] %}
//             |   scoped _ ":" _ abstraction          {% a => [2, a[0], a[4]] %}
//             |   scoped _ ":" _ application          {% a => [2, a[0], a[4]] %}
// 
// symbol  ->  [^\s\(\)$:=|] [^\s\(\)]:*  {% ([a, b]) => a + b.join("") %}
//         |   [:=|] [^\s\(\)]:+          {% ([a, b]) => a + b.join("") %}
// scoped  ->  "_" [^\s\(\)]:*            {% ([a, b]) => a + b.join("") %}
// literal ->  "$" [^\s\(\)]:+            {% ([a, b]) => a + b.join("") %}
// _       ->  [^\S\n]:+                  {% a => null %}
