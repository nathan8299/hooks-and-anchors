'use strict';

const debug = require('debug')('HNA');

class Hook {
  constructor(options = {}) {

    // native properties of all hooks
    this.name = options.name || 'Hook';
    this.settings = {};
    this.hook = undefined;
    this.flags = {
      execute: true,
      hook: true,
      postProcess: true
    };

    // reckon the settings
    this.defaults = {'name': 'Hook'};
    Object.assign(this.settings, this.defaults, options);
    this.selfConfig();
  }

  selfConfig() {
    debug(`Hook ${this.name} - selfConfig()`);
    if (this.settings.name) {
      this.name = this.settings.name;
    }
  }

  process(thing) {
    debug(`Hook ${this.name} - process()`);
    // set all flags to signal go!
    this.setFlags(true);

    // this function embodies the process implementation
    // as a chain of function calls
    const implementation = (thing) => {
      const proc = [];
      const postProc = [];
      this.loadP(proc, postProc);

      // Wrap our thing in a promise
      let p = Promise.resolve(thing);

      proc.forEach((f) => {
          p.then(f(thing));
      });
      postProc.forEach((f) => {
          p.then(f(thing));
      });
      return p;
    };

    let promise;
    try {
      promise = implementation(thing);
    }
    catch (e) {console.log(e);}

    return promise;
  }

  _preProcess(thing) {
    return (thing) => {
      debug(`Hook ${this.name} - _preProcess()`);
      return new Promise( (resolve, reject) => {
        try {
          this.preProcess(thing, resolve, reject);
        }
        catch (e) {console.log(e); reject(e);}
      });
    }
  }

  _execute(thing) {
    return (thing) => {
      debug(`Hook ${this.name} - _execute()`);
      if (this.flags.execute) {
        return new Promise((resolve, reject) => {
          try {
            this.execute(thing, resolve, reject);
          }
          catch (e) {
            reject(e);
          }
        });
      } else {
        return Promise.resolve(thing);
      }
    }
  }

  _postProcess(thing) {
    return (thing) => {
      debug(`Hook ${this.name} - _postProcess()`);
      if (this.flags.postProcess) {
        return new Promise((resolve, reject) => {
          try {
            this.postProcess(thing, resolve, reject);
          }
          catch (e) {
            reject(e);
          }
        });
      } else {
        return Promise.resolve(thing);
      }
    };
  }

  // just template methods here.
  preProcess(thing, resolve, reject) {
    debug(`Hook ${this.name} - preProcess()`);
    resolve(thing);
  }

  execute(thing, resolve, reject) {
    debug(`Hook ${this.name} - execute()`);
    resolve(thing);
  }

  postProcess(thing, resolve, reject) {
    debug(`Hook ${this.name} - postProcess()`);
    resolve(thing);
  }

  setHook(hook, ...a) {
    debug(`Hook ${this.name} - setHook()`);
    // append a hook to the hook chain.
    if (this.isHook(this.hook)) {
      this.hook.setHook(hook, ...a);
    } else {
      // hook could be a package name
      if (typeof hook === 'string' ) {
        return this.setHook(this.classInstanceFromString(hook, ...a));
      }
      // only allow hooks as hooks
      if (this.isHook(hook)) {
        this.hook = hook;
      }
    }
    return hook;
  }

  setFlags(flag = true) {
    debug(`Hook ${this.name} - setFlags() with ${flag}`);
    for (const key in this.flags) {
      this.flags[key] = flag;
    }
    // setFlags down the hook chain
    if (this.isHook(this.hook)) {
      this.hook.setFlags(flag);
    }
  }

  isHook(hook) {
    const type = typeof hook;
    return hook !== null && (type === 'object' || type === 'function') && ('hook' in hook);
  }

  classInstanceFromString(packageLocation, ...a) {
    const Temp = require(packageLocation);
    return new Temp(...a);
  }

  loadP(proc = [], postProc = []) {
    debug(`Hook ${this.name} - loadP()`);
    proc.push(this._preProcess.bind(this));
    proc.push(this._execute.bind(this));
    postProc.unshift(this._postProcess.bind(this));

    // go down the hook chain.
    if (this.isHook(this.hook)) {
      this.hook.loadP(proc, postProc);
    }
    return;
  }
}

class Anchor extends Hook {
  constructor(options = {}) {
    options.name = options.name || 'Anchor';
    super(options);
    // anchors have this additional hooks array and flag
    this.hooks = [];
    this.flags.hooks = true;
  }

  loadP(proc = [], postProc = []) {
    super.loadP(proc, postProc);

    // iterate the hooks collection
    this.hooks.forEach((hook) => {
      if (this.isHook(hook)) {
        hook.loadP(proc, postProc);
      }
    });
    return;
  }

  setFlags(flag = true) {
    super.setFlags(flag);

    this.hooks.forEach((hook) => {
      // setFlags through the collection
      if (this.isHook(hook)) {
        hook.setFlags(flag);
      }
    });
  }
}

module.exports = {
  Hook,
  Anchor
};
