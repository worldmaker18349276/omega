"use strict";
// concept: lambda calculus, HM-typed, flow-based, embeddable
function assert(a) {
    console.assert(a);
}
function makeNode(...parameters) {
    return parameters;
}
function assignNode(node, ...parameters) {
    node.splice(0, node.length, ...parameters);
    return node;
}
function tvarsOf(...nodes) {
    let allNodes = new Set(nodes);
    for (let node of allNodes) {
        let [, ...children] = node;
        for (let child of children)
            allNodes.add(child);
    }
    let tvars = new Set();
    for (let node of allNodes)
        if (node[0] === "TVAR")
            tvars.add(node);
    return tvars;
}
function unify(type1, type2) {
    while (type1[0] === "SAME")
        type1 = type1[1];
    while (type2[0] === "SAME")
        type2 = type2[1];
    if (type1[0] === "TVAR" && type2[0] === "TVAR") {
        if (type1 !== type2)
            type2 = assignNode(type2, "SAME", type1);
    }
    else if (type1[0] === "TVAR") {
        if (tvarsOf(type2).has(type1))
            throw new Error("Infinite Type");
        type1 = assignNode(type1, "SAME", type2);
    }
    else if (type2[0] === "TVAR") {
        if (tvarsOf(type1).has(type2))
            throw new Error("Infinite Type");
        type2 = assignNode(type2, "SAME", type1);
    }
    else if (type1[0] === type2[0]) {
        let [, ...children1] = type1;
        let [, ...children2] = type2;
        for (let i = 0; i < children1.length; i++)
            unify(children1[i], children2[i]);
    }
    else {
        throw new Error("unification fail");
    }
}
function replace(subs, ...nodes) {
    let allNodes = new Set(nodes);
    for (let node of allNodes) {
        if (node[0] !== "LIT") {
            let [, ...children] = node;
            for (let child of children) {
                allNodes.delete(child);
                allNodes.add(child);
            }
        }
    }
    for (let node of Array.from(allNodes).reverse()) {
        if (node[0] !== "LIT") {
            let [, ...children] = node;
            if (children.some((child) => subs.has(child))) {
                let node_ = makeNode(...node);
                for (let i = 0; i < node_.length; i++)
                    if (subs.has(node_[i]))
                        node_[i] = subs.get(node_[i]);
                subs.set(node, node_);
            }
        }
    }
}
function reduce(node, logger) {
    let stack = [makeNode("ID", node)];
    logger = logger || (() => { });
    while (stack.length !== 0) {
        if (stack.length > 1000)
            throw new Error("stack overflow");
        node = stack[stack.length - 1];
        logger(...stack);
        switch (node[0]) {
            case "VAR": // s-
                return false;
            case "LIT": // ${1}-
            case "ABS": // [-x-]-
                stack.pop();
                break;
            case "ID": // [x-]-
                let [, source] = node;
                switch (source[0]) {
                    case "VAR": // [s-]-
                        return false;
                    case "LIT": // [${1}-]-
                    case "ABS": // [[-x-]-]-
                        stack.pop();
                        break;
                    case "ID": // [[x-]-]-  =>  [x-]-
                        let [, source_source] = source;
                        node = assignNode(node, "ID", source_source);
                        break;
                    case "REC": // [[*-x-]-]-
                    case "APP": // [x-y-]-
                        stack.push(source);
                        break;
                }
                break;
            case "REC": // [*-x-]-  =>  [[*-x-]-x-]-
                let [, self, expr] = node;
                let subs = new Map();
                subs.set(self, makeNode(...node));
                replace(subs, expr);
                if (subs.has(expr))
                    expr = subs.get(expr);
                node = assignNode(node, "ID", expr);
                break;
            case "APP": // x-y-
                let [, arg, func] = node;
                switch (func[0]) {
                    case "VAR": // x-s-
                        return false;
                    case "REC": // x-[*-y-]-
                    case "APP": // x-[y-z-]-
                        stack.push(func);
                        break;
                    case "ID": // x-[y-]-  =>  x-y-
                        let [, func_source] = func;
                        node = assignNode(node, "APP", arg, func_source);
                        break;
                    case "ABS": // x-[-y-]-  =>  [x-y-]-
                        let [, func_var, func_res] = func;
                        let subs = new Map();
                        subs.set(func_var, arg);
                        replace(subs, func_res);
                        if (subs.has(func_res))
                            func_res = subs.get(func_res);
                        node = assignNode(node, "ID", func_res);
                        break;
                    case "LIT": // x-${f}-
                        switch (arg[0]) {
                            case "VAR": // t-s-
                                return false;
                            case "ABS": // [-x-]-s-
                                throw new Error();
                            case "REC": // [*-x-]-s-
                            case "APP": // [x-y-]-s-
                                stack.push(arg);
                                break;
                            case "ID": // [x-]-s-  =>  x-s-
                                let [, arg_source] = arg;
                                node = assignNode(node, "APP", arg_source, func);
                                break;
                            case "LIT": // ${a}-${f}-  =>  ${f(a)}-
                                node = assignNode(node, "LIT", func[1](arg[1]));
                                break;
                        }
                        break;
                }
                break;
        }
    }
    return true;
}
function* a2z(chars) {
    yield* chars;
    for (let prefix of a2z(chars))
        for (let ch of chars)
            yield prefix + ch;
    return "";
}
function naming(type) {
    let namespace = new WeakMap();
    let name_gen = a2z("abcdefghijklmnopqrstuvwxyz");
    let allNodes = new Set([type]);
    for (let node of allNodes) {
        let [, ...children] = node;
        for (let child of children) {
            allNodes.delete(child);
            allNodes.add(child);
        }
    }
    for (let node of Array.from(allNodes).reverse()) {
        if (namespace.has(node))
            continue;
        switch (node[0]) {
            case "TVAR":
                namespace.set(node, name_gen.next().value);
                break;
            case "RAW":
                namespace.set(node, "$");
                break;
            case "SAME":
                let source = namespace.get(node[1]);
                namespace.set(node, source);
                break;
            case "ARR":
                let from = namespace.get(node[1]);
                if (Array.isArray(from))
                    from = `[${from[0]}-${from[1]}]`;
                let to = namespace.get(node[2]);
                if (Array.isArray(to))
                    to = `${to[0]}-${to[1]}`;
                namespace.set(node, [from, to]);
                break;
        }
    }
    let typename = namespace.get(type);
    if (Array.isArray(typename))
        typename = `[${typename[0]}-${typename[1]}]`;
    return typename;
}
class Machine {
    constructor(env = {}) {
        this.contexts = [{ type: "main", state: "", scope: env }];
        this.values = [];
    }
    get current() {
        return this.contexts[this.contexts.length - 1];
    }
    define(name, value, type) {
        let free = tvarsOf(type);
        for (let { bound } of this.contexts)
            if (bound !== undefined)
                for (let tvar of tvarsOf(bound.type))
                    free.delete(tvar);
        this.current.scope[name] = { value, type, free };
    }
    use(name) {
        if (!(name in this.current.scope))
            throw new Error(`Unknown Variable: ${name}`);
        let { value, type, free } = this.current.scope[name];
        let subs = new Map();
        for (let type of free)
            subs.set(type, makeNode("TVAR"));
        replace(subs, type);
        if (subs.has(type))
            type = subs.get(type);
        return { value, type };
    }
    push(obj) {
        this.values.push(obj);
    }
    wrap() {
        let obj = this.values.pop();
        let value = makeNode("LIT", obj);
        let type = makeNode("RAW");
        this.values.push({ value, type });
    }
    find() {
        let name = this.values.pop();
        let { value, type } = this.use(name);
        this.values.push({ value, type });
    }
    apply() {
        let func = this.values.pop();
        let arg = this.values.pop();
        let value = makeNode("APP", arg.value, func.value);
        let type = makeNode("TVAR");
        unify(func.type, makeNode("ARR", arg.type, type));
        this.values.push({ value, type });
    }
    shelve() {
        let name = this.values.pop();
        let { value, type } = this.values.pop();
        this.define(name, value, type);
        if (this.current.state === "")
            reduce(value);
    }
    enter(state) {
        let scope = Object.create(this.current.scope);
        this.contexts.push({ state, scope });
    }
    init(typ) {
        this.current.type = typ;
        if (typ === "thunk") {
        }
        else if (typ === "proc" || typ === "rec") {
            let value = makeNode("VAR");
            let type = makeNode("TVAR");
            this.current.bound = { value, type };
            this.values.push(this.current.bound);
        }
        else if (typ === "main") {
            throw new Error("unable to init main");
        }
        else {
            throw new Error(`unknown context type: ${typ}`);
        }
    }
    leave() {
        let { type: typ, state, scope, bound } = this.contexts.pop();
        if (typ === "thunk") {
        }
        else if (typ === "proc") {
            assert(bound !== undefined);
            let res = this.values.pop();
            let value = makeNode("ABS", bound.value, res.value);
            let type = makeNode("ARR", bound.type, res.type);
            this.values.push({ value, type });
        }
        else if (typ === "rec") {
            assert(bound !== undefined);
            let expr = this.values.pop();
            let value = makeNode("REC", bound.value, expr.value);
            let type = bound.type;
            unify(bound.type, expr.type);
            this.values.push({ value, type });
        }
        else {
            throw new Error(`unknown context type: ${typ}`);
        }
        return state;
    }
}
const PDA = {
    "": {
        "$": () => "",
        "s": () => "",
        "[": () => "",
        "*": () => "",
        "-": () => "",
        "]": () => "",
        ",": () => "",
    },
    ",": {
        "$": (v, m) => (m.push(v), m.wrap(), "x"),
        "s": (v, m) => (m.push(v), m.find(), "x"),
        "[": (v, m) => (m.enter("x"), "["),
        "*": () => "",
        "-": () => "",
        "]": () => "",
        ",": () => "",
    },
    "x": {
        "$": () => "",
        "s": () => "",
        "[": () => "",
        "*": () => "",
        "-": (v, m) => "x-",
        "]": () => "",
        ",": () => "",
    },
    "x-": {
        "$": (v, m) => (m.push(v), m.wrap(), "x-x"),
        "s": (v, m) => (m.push(v), "x-s"),
        "[": (v, m) => (m.enter("x-x"), "["),
        "*": () => "",
        "-": () => "",
        "]": (v, m) => m.leave(),
        ",": () => "",
    },
    "x-s": {
        "$": () => "",
        "s": () => "",
        "[": () => "",
        "*": () => "",
        "-": (v, m) => (m.find(), m.apply(), "x-"),
        "]": () => "",
        ",": (v, m) => (m.shelve(), ","),
    },
    "x-x": {
        "$": () => "",
        "s": () => "",
        "[": () => "",
        "*": () => "",
        "-": (v, m) => (m.apply(), "x-"),
        "]": () => "",
        ",": () => "",
    },
    "[": {
        "$": (v, m) => (m.init("thunk"), m.push(v), m.wrap(), "x"),
        "s": (v, m) => (m.init("thunk"), m.push(v), m.find(), "x"),
        "[": (v, m) => (m.init("thunk"), m.enter("x"), "["),
        "*": (v, m) => "[*",
        "-": (v, m) => (m.init("proc"), "x-"),
        "]": () => "",
        ",": () => "",
    },
    "[*": {
        "$": () => "",
        "s": () => "",
        "[": () => "",
        "*": () => "",
        "-": (v, m) => (m.init("rec"), "x-"),
        "]": () => "",
        ",": () => "",
    },
};
function interpreter(env = {}) {
    function taggerize(iter) {
        iter.next();
        return function (strings, ...values) {
            iter.next(strings[0]);
            for (let i = 1; i < strings.length; i++) {
                iter.next({ value: values[i - 1] });
                iter.next(strings[i]);
            }
            iter.next("\n");
        };
    }
    function* streamize(iter) {
        iter.next();
        while (true) {
            let input = yield;
            if (typeof input !== "string") {
                iter.next(input);
            }
            else {
                for (let ch of input)
                    iter.next(ch);
            }
        }
    }
    function* tokenize(iter) {
        const DELIMITER = /\s/;
        const LINE = /-/;
        const WORD = /\w/;
        const OTHERS = /[\[\*\],]/;
        iter.next();
        let input = yield;
        while (true) {
            while (typeof input === "string" && DELIMITER.test(input))
                input = yield;
            let token;
            if (typeof input !== "string") {
                token = ["$", input.value];
                input = yield;
            }
            else if (typeof input === "string" && WORD.test(input)) {
                let word = "";
                while (typeof input === "string" && WORD.test(input)) {
                    word = word + input;
                    input = yield;
                }
                token = ["s", word];
            }
            else if (typeof input === "string" && LINE.test(input)) {
                token = ["-"];
                while (typeof input === "string" && LINE.test(input))
                    input = yield;
            }
            else if (typeof input === "string" && OTHERS.test(input)) {
                token = [input];
                input = yield;
            }
            else {
                token = [null, input];
            }
            iter.next(token);
        }
    }
    function* parser(env) {
        let machine = new Machine(env);
        let state = ",";
        while (true) {
            let [action, value] = yield;
            if (action === null)
                throw new Error(`invalid token ${value}`);
            state = PDA[state][action](value, machine);
            if (!state)
                throw new Error("syntax error");
        }
    }
    return taggerize(streamize(tokenize(parser(env))));
}
// https://omrelli.ug/nearley-playground/
// main    ->  _ expr proc symbol _ "," _
// 
// symbol  ->  [\w]:+
// _       ->  [\s\n]:*
// to      ->  _ "-":+ _
// 
// proc    ->  to
//         |   to expr proc
//         |   to symbol _ "," _ expr proc
// 
// expr    ->  symbol
//         |   "[" proc "]"
//         |   "[" _ expr proc "]"
//         |   "[" _ "*" proc "]"
// [-f, [-]-]-0,
// [-f, [-f-]-]-1,
// [-f, [-f-f-]-]-2,
// [-f, [-f-f-f-]-]-3,
// [-n, [-f, f-n-fn, [-fn-f-]-]-]-succ,
// [-n, [-]-[[-_, 0-]-[[-x, [-y, succ-x-y-]-]-n-]-]-]-pred,
// [-x, [-y, x-]-]-true,
// [-x, [-y, y-]-]-false,
// [-a, [-b, a-[b-a-]-]-]-and,
// [-a, [-b, b-[a-a-]-]-]-or,
// [-a, [-x, [-y, x-[y-a-]-]-]-]-not,
// [-f, [-]-]-nil,
// [-f, [-[0-f-]-]-]-list_0,
// [-f, [-[1-f-]-[0-f-]-]-]-list_0_1,
// [-f, [-[2-f-]-[1-f-]-[0-f-]-]-]-list_0_1_2,
// [-head, [-tail, [-f, [-[f-tail-]-[head-f-]-]-]-]-]-cons,
// [-list, _-[[-x, [-y, x-]-]-list-]-]-head,
// [-list, [-head, [-tail, _-[[-x, tail-]-[[-h [-t  head-t-[h-cons-]-]-]-list-]-]-]-]-]-tail,
// [-list, true-[[-_, [-_, false-]-]-list-]-]-isnil,
// [-x, x-x-]-ω,
// [-f, [-ω-f-]-ω-]-fix,
