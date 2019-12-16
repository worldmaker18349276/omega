"use strict";

// syntax:
//    <raw declaration>  =   <symbol> + "=" + <symbol> + <symbol>
//                       |   <symbol> + <symbol> + "=" + <symbol>
//                       |   <symbol> + "=" + <literal> ;
//    <expression>    =  { <symbol> | <literal> | "(" + <expression> + ")" | "(" + <lambda> + ")" } ;
//    <lambda>        =  { <symbol> } + ":" + ( <lambda> | <expression> ) ;
//    <declaration>   =  { <symbol> } + "=" + <expression> ;

// basic:
//    a = ${3}  | assign
//    b = f a   | registration
//    g a = b   | definition
//    ! = !     | reduce operator
//    !! = !!   | evaluate operator
//    x = _     | forgetful (unable to bind, interrupt when evaluating)
//    _x = ${2} | dummy (forget after parse)

// sugar:
//    a = b c d
//    | <=>
//    |   b' = b c
//    |   a = b' d
//    a = b ( c d )
//    | <=>
//    |   c' = c d
//    |   a = b c'
//    b c d = a
//    | <=>
//    |   b c = b'
//    |   b' d = a

//    a = ( c : b ) d
//    a = c : d :
//         e = d d
//         c e e
//    a = c : d :
//         e != d c
//         c e

//    ... !( a ) ...
//    | <=>
//    |   ! a ( ... a ... )

//    0 f = a : a                       |  zero  ( == becomes identity )
//    1 f = a : f a                     |  one   ( == identity )
//    2 f = a : f ( f a )               |  two
//    3 f = a : f ( f ( f a ) )         |  three

//    | _____ flatten definitions ______
//    0 f = 1                           |  zero
//    1 f = f                           |  one
//    2 f = f^2                         |  two
//    3 f = f^3                         |  three
//    oo f = f*                         |  infinity
//    fa = f a
//    f^2 a = f^2a
//    f^2a = f fa
//    f^3 a = f^3a
//    f^3a = f^2 fa
//    f* a = f*a
//    f*a = f* fa

//    | ____ recursion definitions _____
//    1 f = a : 0 f ( f a )             |  one
//    2 f = a : 1 f ( f a )             |  two
//    3 f = a : 2 f ( f a )             |  three
//    ${n} f = a : ${n-1} f ( f a )     |  n
//    oo f = a : oo f ( f a )           |  infinity

//    | _______ strict version _________
//    0! f = a : a                      |  zero! == zero
//    1! f = a : f a                    |  one! == one
//    2! f = a : f !( f a )             |  two!
//    3! f = a : f !( f !( f a ) )      |  three!
//    ${n}! f = a : ${n-1}! f !( f a )  |  n!
//    oo! f = a : oo! f !( f a )        |  infinity! (infinity loop)


const NAT = 0;
const APP = 1;
const ABS = 2;
class Omega
{
  constructor() {
    this.context = new WeakMap();
    this.symbols = new Map();
    this.counter = 0;

    this.builtins = {};
    this.preserved = [];

    let id = this.add("id");
    this.assign(id, Symbol("id"));
    this.symbols.set("id", id);
    this.builtins["id"] = id;
    this.preserved.push(id);

    let reduce = this.add("!");
    this.assign(reduce, Symbol("!"));
    this.symbols.set("!", reduce);
    this.builtins["!"] = reduce;
    this.preserved.push(reduce);

    let evaluate = this.add("!!");
    this.assign(evaluate, Symbol("!!"));
    this.symbols.set("!!", evaluate);
    this.builtins["!!"] = evaluate;
    this.preserved.push(evaluate);
  }

  get(name) {
    return this.symbols.get(name);
  }
  add(name="", override=true) {
    let vari = [];
    if ( override ) {
      this.delete(name);
      this.context.set(vari, name);
      if ( !name.startsWith("_") ) {
        this.symbols.set(name, vari);
      }

    } else {
      this.context.set(vari, this.rename(name, true));
    }
    return vari;
  }
  delete(name) {
    if ( this.symbols.has(name) ) {
      let vari = this.symbols.get(name);
      this.symbols.delete(name);
      this.context.set(vari, this.rename(name, true));
    }
  }
  rename(name, hide=false) {
    const num = "₀₁₂₃₄₅₆₇₈₉";
    let p = `${this.counter++}`.split("").map(i => num[parseInt(i)]).join("");
    if ( !name.startsWith("_") ) {
      name = "_" + name;
    }
    return name + p;
  }

  sentence(vari) {
    let vari_name = this.context.get(vari);
    if ( vari[0] === undefined ) {
      return "";

    } else if ( vari[0] === NAT && this.preserved.some(v => v[1] === vari[1]) ) {
      return `${vari_name} = ${vari[1].description}`;

    } else if ( vari[0] === NAT ) {
      return `${vari_name} = \$\{${vari[1]}\}`;

    } else if ( vari[0] === APP ) {
      let func_name = this.context.get(vari[1]);
      let arg_name = this.context.get(vari[2]);
      return `${vari_name} = ${func_name} ${arg_name}`;

    } else if ( vari[0] === ABS ) {
      let arg_name = this.context.get(vari[1]);
      let res_name = this.context.get(vari[2]);
      return `${vari_name} ${arg_name} = ${res_name}`;
    }
  }
  log(hightlight=[], prefix="") {
    let varis = Array.from(this.symbols.values()).filter(v => v[0] !== undefined);
    for ( let i=0; i<varis.length; i++ ) if ( varis[i][0] !== undefined )
      if ( varis[i][0] !== NAT ) for ( let v_ of varis[i].slice(1) )
        if ( !varis.includes(v_) && v_[0] !== undefined ) {
          varis.splice(i+1, 0, v_);
        }

    let vari0 = hightlight[hightlight.length-1];
    let indent = prefix.replace(/./, ' ');

    let colors = new Map(hightlight.map((v,i) => [v, "color:blue"]));
    let str = varis.map(v => `%c${v===vari0 ? prefix : indent}${this.sentence(v)}`).join("\n");
    let css = varis.map(v => colors.get(v) || "color:reset");
    console.log(str, ...css);
  }

  // a = ${value}
  assign(vari, value) {
    if ( this.preserved.includes(vari) ) {
      throw new Error("what are you doing!");
    }
    vari.splice(0, vari.length, NAT, value);
  }
  // a = b c
  register(vari, func, arg) {
    if ( this.preserved.includes(vari) ) {
      throw new Error("what are you doing!");
    }
    vari.splice(0, vari.length, APP, func, arg);
  }
  // b c = a
  define(vari, arg, res) {
    if ( this.preserved.includes(vari) ) {
      throw new Error("what are you doing!");
    }
    vari.splice(0, vari.length, ABS, arg, res);
  }

  is_id(vari) {
    return vari[0] === NAT && vari[1] === this.builtins["id"][1];
  }
  is_reduce(vari) {
    return vari[0] === NAT && vari[1] === this.builtins["!"][1];
  }
  is_eval(vari) {
    return vari[0] === NAT && vari[1] === this.builtins["!!"][1];
  }

  reduce(vari, bond=[], verbose) {
    let stack = [vari];

    while ( stack.length !== 0 ) {
      vari = stack[stack.length-1];

      if ( verbose && !bond.includes(vari) && vari[0] !== undefined ) {
        this.log([...verbose, ...stack], "» ");
      }

      if ( bond.includes(vari) ) {
        stack.pop();
        continue;
      } else if ( vari[0] === undefined ) {
        throw new Error("undefined variable");
      } else if ( vari[0] === NAT || vari[0] === ABS ) {
        if ( verbose ) this.log([...verbose, ...stack], "« ");
        stack.pop();
        continue;
      }

      let func = vari[1];
      let arg = vari[2];

      if ( func[0] === APP ) {
        // application of application:   ((a b) c)
        stack.push(func);
        continue;

      } else if ( func[0] === ABS ) {
        // beta-reduction for lambda function:   ((a : b) c)  =>  (b[c/a])
        let res = this.subs(func[2], func[1], arg, bond) || func[2];
        this.register(vari, this.builtins["id"], res);
        continue;

      } else if ( this.is_id(func) && stack.length > 1 ) {
        // shorten pointer:   ((a) b)  =>  (a b)
        stack.pop();
        vari = stack[stack.length-1];
        this.register(vari, arg, vari[2]);
        continue;
      }

      // strict evaluation

      let whnf = true;
      if ( arg[0] !== NAT && arg[0] !== ABS ) {
        whnf = this.reduce(arg, bond, verbose && [...verbose, ...stack]);
        if ( whnf && this.is_eval(func) ) {
          whnf = this.eval(arg, bond, verbose && [...verbose, ...stack]);
        }
      }
      if ( !whnf ) {
        return false;
      }

      // shorten pointer:   (++ (b))  =>  (++ b)
      if ( arg[0] === APP && this.is_id(arg[1]) ) {
        arg = arg[2];
        this.register(vari, func, arg);
        if ( verbose ) this.log([...verbose, ...stack], "» ");
      }

      if ( this.is_id(func) ) { // stack.length === 1
        if ( arg[0] === NAT )
          this.assign(vari, arg[1]);
        else if ( arg[0] === ABS )
          this.define(vari, arg[1], arg[2]);

      } else if ( this.is_reduce(func) || this.is_eval(func) ) {
        this.assign(vari, this.builtins["id"][1]);

      } else {
        if ( arg[0] !== NAT || this.preserved.some(v => v[1] === arg[1]) ) {
          throw new Error("type mismatched");
        }
        this.assign(vari, func[1](arg[1]));
      }

      if ( verbose ) this.log([...verbose, ...stack], "« ");
      stack.pop();
    }

    return true;
  }
  eval(vari, bond=[], verbose) {
    let nf = this.reduce(vari, bond, verbose);

    if ( vari[0] === APP ) {
      let whnf = this.eval(vari[2], bond, verbose);
      nf = nf && whnf;
    } else if ( vari[0] === ABS ) {
      bond.push(vari[1]);
      let whnf = this.eval(vari[2], bond, verbose);
      nf = nf && whnf;
    }

    return nf;
  }
  subs(target, from, to, bond=[]) {
    if ( target === from ) {
      return to;

    } else if ( bond.includes(target) || target[0] === undefined ) {
      return;

    } else if ( target[0] === APP ) {
      let func_ = this.subs(target[1], from, to, bond);
      let arg_ = this.subs(target[2], from, to, bond);
      if ( func_ === undefined && arg_ === undefined )
        return;

      let target_ = this.add(this.context.get(target), false);
      this.register(target_, func_ || target[1], arg_ || target[2]);
      return target_;

    } else if ( target[0] === ABS ) {
      if ( target[1] === from )
        return;
      let res_ = this.subs(target[2], from, to, [target[1], ...bond]);
      if ( res_ === undefined )
        return;

      let target_ = this.add(this.context.get(target), false);
      this.define(target_, target[1], res_);
      return target_;
    }
  }

  parse(template, ...values) {
    let literal = "<0>";
    for ( let i=0; !template.every(s => !s.match(literal)); literal=`<${++i}>` );
    let str = template.join(literal);

    const sp = String.raw`[^\S\n]+`;
    const pd = String.raw`[^\S\n]*`;
    const c = String.raw`(?:${sp}\|${sp}[^\n]*)?`;
    const atom = String.raw`(\S*[^\s\|]\S*)`;
    const cst = pd + [atom, "=", atom].join(sp)       + pd + c;
    const app = pd + [atom, "=", atom, atom].join(sp) + pd + c;
    const abs = pd + [atom, atom, "=", atom].join(sp) + pd + c;
    const com = String.raw`(?:${pd}\|${sp}[^\n]*)?`;
    const regex = new RegExp(String.raw`(?:${cst}|${app}|${abs}|${com})(?:\n|$)`, "y");

    let bond = {};
    let sentences = [];
    let matched, a1, a2, r1, r2, r3, d1, d2, d3;
    while ( [matched, a1, a2, r1, r2, r3, d1, d2, d3] = regex.exec(str) || [] ) {
      if ( a1 !== undefined ) {
        if ( a1.match(literal) )
          throw new Error("invalid syntax");

        if ( a1 !== "_" )
          bond[a1] = true;

        if ( a2 === literal )
          sentences.push(["assign", a1, values.shift()]);
        else if ( this.builtins.hasOwnProperty(a2) )
          sentences.push(["assign", a1, this.builtins[a2][1]]);
        else
          throw new Error(`invalid literal: ${a2}`);

      } else if ( r1 !== undefined ) {
        if ( r1.match(literal) || r2.match(literal) || r3.match(literal) )
          throw new Error("invalid syntax");
        if ( bond[r1] )
          throw new Error("rebind variable");

        if ( r1 !== "_" )
          bond[r1] = true;
        if ( r2 !== "_" )
          bond[r2] = bond[r2] || false;
        if ( r3 !== "_" )
          bond[r3] = bond[r3] || false;

        sentences.push(["register", r1, r2, r3]);

      } else if ( d1 !== undefined ) {
        if ( d1.match(literal) || d2.match(literal) || d3.match(literal) )
          throw new Error("invalid syntax");
        if ( bond[d1] )
          throw new Error("rebind variable");
        if ( bond[d2] )
          throw new Error("rebind variable");

        if ( d1 !== "_" )
          bond[d1] = true;
        if ( d2 !== "_" )
          bond[d2] = true;
        if ( d3 !== "_" )
          bond[d3] = bond[d3] || false;

        sentences.push(["define", d1, d2, d3]);

      } else if ( matched === undefined ) {
        throw new Error("invalid syntax");
      }

      if ( regex.lastIndex === str.length )
        break;
    }

    for ( let name of Object.getOwnPropertyNames(bond) ) {
      if ( bond[name] )
        bond[name] = this.add(name);
      else
        bond[name] = this.get(name) || this.add(name);
    }

    for ( let [type, ...para] of sentences ) {
      if ( type === "assign" ) {
        let a1 = bond[para[0]] || this.add("", false);
        this.assign(a1, para[1]);

      } else if ( type === "register" ) {
        let a1 = bond[para[0]] || this.add("", false);
        let a2 = bond[para[1]] || this.add("", false);
        let a3 = bond[para[2]] || this.add("", false);
        this.register(a1, a2, a3);

      } else if ( type === "define" ) {
        let a1 = bond[para[0]] || this.add("", false);
        let a2 = bond[para[1]] || this.add("", false);
        let a3 = bond[para[2]] || this.add("", false);
        this.define(a1, a2, a3);

      }
    }

    return this;
  }
}

