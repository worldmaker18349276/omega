const template_sym = document.createElement("template");
template_sym.innerHTML = `
<style>
:host {
  display: inline-block;
  padding-top: 0.1em;
  padding-bottom: 0.1em;
  padding-left: 0.2em;
  padding-right: 0.2em;
  cursor: pointer;
  /* text-decoration: line-through; */
}
:host(:hover) {
  background: rgba(0,0,256,0.1);
}
</style>

<slot></slot>
`;
customElements.define("xi-sym", class extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: "open"});
    this.shadowRoot.appendChild(template_sym.content.cloneNode(true));
  }
});

const template_pipe = document.createElement("template");
template_pipe.innerHTML = `
<style>
:host {
  display: inline-block;
}
:host([slot="func"]) .thunk {
  display: inline-block;
  padding-top: 0.1em;
  padding-bottom: 0.1em;
}
:host([slot="func"]) .thunk:hover {
  background: rgba(0,0,256,0.1);
}
:host([slot="func"]) .thunk::before {
  content: '[';
}
:host([slot="func"]) .thunk::after {
  content: '-]';
}
.func::before {
  content: '-';
}
.let:empty {
  display: none;
}
.let:not(:empty)::before {
  content: '-';
}
.let:not(:empty)::after {
  content: ',';
}
</style>

<span class="thunk">\
<slot class="arg" name="arg"><xi-sym>_</xi-sym></slot>\
<slot class="func" name="func"><xi-sym>_</xi-sym></slot>\
</span>\
<span class="let"></span>
`;
customElements.define("xi-pipe", class extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: "open"});
    this.shadowRoot.appendChild(template_pipe.content.cloneNode(true));
  }
  static get observedAttributes() {
    return ["let"];
  }
  attributeChangedCallback(name, old, value) {
    if ( old !== value ) {
      if ( name === "let" ) {
        this.shadowRoot.querySelector(".let").innerHTML = "<xi-sym>" + this.getAttribute("let") + "</xi-sym>";
      }
    }
  }
});

const template_proc = document.createElement("template");
template_proc.innerHTML = `
<style>
:host {
  display: inline-block;
}
.thunk {
  display: inline-block;
  padding-top: 0.1em;
  padding-bottom: 0.1em;
}
.thunk:hover {
  background: rgba(0,0,256,0.1);
}
.thunk::before {
  content: '[';
}
.thunk::after {
  content: ']';
}
.content::slotted(*) {
  margin-left: 0.5em;
  margin-right: 0.5em;
}
.res::after {
  content: '-';
}
.var:not(:empty)::before {
  content: '-';
}
.var:not(:empty)::after {
  content: ',';
}
.let:not(:empty)::before {
  content: '-';
}
.let:not(:empty)::after {
  content: ',';
}
</style>

<span class="thunk">\
<span class="var">_</span>\
<slot class="content"></slot>\
<slot class="res" name="res"><xi-sym class="var">_</xi-sym></slot>\
</span>\
<span class="let"></span>
`;
customElements.define("xi-proc", class extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: "open"});
    this.shadowRoot.appendChild(template_proc.content.cloneNode(true));
  }
  static get observedAttributes() {
    return ["var", "let"];
  }
  attributeChangedCallback(name, old, value) {
    if ( old !== value ) {
      if ( name === "var" ) {
        this.shadowRoot.querySelector(".var").innerHTML = "<xi-sym>" + this.getAttribute("var") + "</xi-sym>";
      } else if ( name === "let" ) {
        this.shadowRoot.querySelector(".let").innerHTML = "<xi-sym>" + this.getAttribute("let") + "</xi-sym>";
      }
    }
  }
});
