
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
const global = globalThis;

import require$$0$1 from 'events';
import stream_1 from 'stream';
import buffer from 'buffer';
import { inflateSync } from 'zlib';

function noop$4() { }
function add_location(element, file, line, column, char) {
    element.__svelte_meta = {
        loc: { file, line, column, char }
    };
}
function run(fn) {
    return fn();
}
function blank_object() {
    return Object.create(null);
}
function run_all(fns) {
    fns.forEach(run);
}
function is_function(thing) {
    return typeof thing === 'function';
}
function safe_not_equal(a, b) {
    return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
}
function is_empty(obj) {
    return Object.keys(obj).length === 0;
}
function insert(target, node, anchor) {
    target.insertBefore(node, anchor || null);
}
function detach(node) {
    node.parentNode.removeChild(node);
}
function element(name) {
    return document.createElement(name);
}
function text(data) {
    return document.createTextNode(data);
}
function space() {
    return text(' ');
}
function listen(node, event, handler, options) {
    node.addEventListener(event, handler, options);
    return () => node.removeEventListener(event, handler, options);
}
function prevent_default(fn) {
    return function (event) {
        event.preventDefault();
        // @ts-ignore
        return fn.call(this, event);
    };
}
function attr(node, attribute, value) {
    if (value == null)
        node.removeAttribute(attribute);
    else if (node.getAttribute(attribute) !== value)
        node.setAttribute(attribute, value);
}
function children(element) {
    return Array.from(element.childNodes);
}
function custom_event(type, detail, bubbles = false) {
    const e = document.createEvent('CustomEvent');
    e.initCustomEvent(type, bubbles, false, detail);
    return e;
}

let current_component;
function set_current_component(component) {
    current_component = component;
}
// TODO figure out if we still want to support
// shorthand events, or if we want to implement
// a real bubbling mechanism
function bubble(component, event) {
    const callbacks = component.$$.callbacks[event.type];
    if (callbacks) {
        // @ts-ignore
        callbacks.slice().forEach(fn => fn.call(this, event));
    }
}

const dirty_components = [];
const binding_callbacks = [];
const render_callbacks = [];
const flush_callbacks = [];
const resolved_promise = Promise.resolve();
let update_scheduled = false;
function schedule_update() {
    if (!update_scheduled) {
        update_scheduled = true;
        resolved_promise.then(flush);
    }
}
function add_render_callback(fn) {
    render_callbacks.push(fn);
}
function add_flush_callback(fn) {
    flush_callbacks.push(fn);
}
let flushing = false;
const seen_callbacks = new Set();
function flush() {
    if (flushing)
        return;
    flushing = true;
    do {
        // first, call beforeUpdate functions
        // and update components
        for (let i = 0; i < dirty_components.length; i += 1) {
            const component = dirty_components[i];
            set_current_component(component);
            update(component.$$);
        }
        set_current_component(null);
        dirty_components.length = 0;
        while (binding_callbacks.length)
            binding_callbacks.pop()();
        // then, once components are updated, call
        // afterUpdate functions. This may cause
        // subsequent updates...
        for (let i = 0; i < render_callbacks.length; i += 1) {
            const callback = render_callbacks[i];
            if (!seen_callbacks.has(callback)) {
                // ...so guard against infinite loops
                seen_callbacks.add(callback);
                callback();
            }
        }
        render_callbacks.length = 0;
    } while (dirty_components.length);
    while (flush_callbacks.length) {
        flush_callbacks.pop()();
    }
    update_scheduled = false;
    flushing = false;
    seen_callbacks.clear();
}
function update($$) {
    if ($$.fragment !== null) {
        $$.update();
        run_all($$.before_update);
        const dirty = $$.dirty;
        $$.dirty = [-1];
        $$.fragment && $$.fragment.p($$.ctx, dirty);
        $$.after_update.forEach(add_render_callback);
    }
}
const outroing = new Set();
let outros;
function transition_in(block, local) {
    if (block && block.i) {
        outroing.delete(block);
        block.i(local);
    }
}
function transition_out(block, local, detach, callback) {
    if (block && block.o) {
        if (outroing.has(block))
            return;
        outroing.add(block);
        outros.c.push(() => {
            outroing.delete(block);
            if (callback) {
                if (detach)
                    block.d(1);
                callback();
            }
        });
        block.o(local);
    }
}

const globals = (typeof window !== 'undefined'
    ? window
    : typeof globalThis !== 'undefined'
        ? globalThis
        : global);

function bind(component, name, callback) {
    const index = component.$$.props[name];
    if (index !== undefined) {
        component.$$.bound[index] = callback;
        callback(component.$$.ctx[index]);
    }
}
function create_component(block) {
    block && block.c();
}
function mount_component(component, target, anchor, customElement) {
    const { fragment, on_mount, on_destroy, after_update } = component.$$;
    fragment && fragment.m(target, anchor);
    if (!customElement) {
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
    }
    after_update.forEach(add_render_callback);
}
function destroy_component(component, detaching) {
    const $$ = component.$$;
    if ($$.fragment !== null) {
        run_all($$.on_destroy);
        $$.fragment && $$.fragment.d(detaching);
        // TODO null out other refs, including component.$$ (but need to
        // preserve final state?)
        $$.on_destroy = $$.fragment = null;
        $$.ctx = [];
    }
}
function make_dirty(component, i) {
    if (component.$$.dirty[0] === -1) {
        dirty_components.push(component);
        schedule_update();
        component.$$.dirty.fill(0);
    }
    component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
}
function init$1(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
    const parent_component = current_component;
    set_current_component(component);
    const $$ = component.$$ = {
        fragment: null,
        ctx: null,
        // state
        props,
        update: noop$4,
        not_equal,
        bound: blank_object(),
        // lifecycle
        on_mount: [],
        on_destroy: [],
        on_disconnect: [],
        before_update: [],
        after_update: [],
        context: new Map(parent_component ? parent_component.$$.context : options.context || []),
        // everything else
        callbacks: blank_object(),
        dirty,
        skip_bound: false,
        root: options.target || parent_component.$$.root
    };
    append_styles && append_styles($$.root);
    let ready = false;
    $$.ctx = instance
        ? instance(component, options.props || {}, (i, ret, ...rest) => {
            const value = rest.length ? rest[0] : ret;
            if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                if (!$$.skip_bound && $$.bound[i])
                    $$.bound[i](value);
                if (ready)
                    make_dirty(component, i);
            }
            return ret;
        })
        : [];
    $$.update();
    ready = true;
    run_all($$.before_update);
    // `false` as a special case of no DOM component
    $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
    if (options.target) {
        if (options.hydrate) {
            const nodes = children(options.target);
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            $$.fragment && $$.fragment.l(nodes);
            nodes.forEach(detach);
        }
        else {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            $$.fragment && $$.fragment.c();
        }
        if (options.intro)
            transition_in(component.$$.fragment);
        mount_component(component, options.target, options.anchor, options.customElement);
        flush();
    }
    set_current_component(parent_component);
}
/**
 * Base class for Svelte components. Used when dev=false.
 */
class SvelteComponent {
    $destroy() {
        destroy_component(this, 1);
        this.$destroy = noop$4;
    }
    $on(type, callback) {
        const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
        callbacks.push(callback);
        return () => {
            const index = callbacks.indexOf(callback);
            if (index !== -1)
                callbacks.splice(index, 1);
        };
    }
    $set($$props) {
        if (this.$$set && !is_empty($$props)) {
            this.$$.skip_bound = true;
            this.$$set($$props);
            this.$$.skip_bound = false;
        }
    }
}

function dispatch_dev(type, detail) {
    document.dispatchEvent(custom_event(type, Object.assign({ version: '3.42.5' }, detail), true));
}
function insert_dev(target, node, anchor) {
    dispatch_dev('SvelteDOMInsert', { target, node, anchor });
    insert(target, node, anchor);
}
function detach_dev(node) {
    dispatch_dev('SvelteDOMRemove', { node });
    detach(node);
}
function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
    const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
    if (has_prevent_default)
        modifiers.push('preventDefault');
    if (has_stop_propagation)
        modifiers.push('stopPropagation');
    dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
    const dispose = listen(node, event, handler, options);
    return () => {
        dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
        dispose();
    };
}
function attr_dev(node, attribute, value) {
    attr(node, attribute, value);
    if (value == null)
        dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
    else
        dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
}
function validate_slots(name, slot, keys) {
    for (const slot_key of Object.keys(slot)) {
        if (!~keys.indexOf(slot_key)) {
            console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
        }
    }
}
/**
 * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
 */
class SvelteComponentDev extends SvelteComponent {
    constructor(options) {
        if (!options || (!options.target && !options.$$inline)) {
            throw new Error("'target' is a required option");
        }
        super();
    }
    $destroy() {
        super.$destroy();
        this.$destroy = () => {
            console.warn('Component was already destroyed'); // eslint-disable-line no-console
        };
    }
    $capture_state() { }
    $inject_state() { }
}

var queueMicrotask_1 = typeof queueMicrotask === 'function' ? queueMicrotask : (fn) => Promise.resolve().then(fn);

var fixedSize = class FixedFIFO {
  constructor (hwm) {
    if (!(hwm > 0) || ((hwm - 1) & hwm) !== 0) throw new Error('Max size for a FixedFIFO should be a power of two')
    this.buffer = new Array(hwm);
    this.mask = hwm - 1;
    this.top = 0;
    this.btm = 0;
    this.next = null;
  }

  push (data) {
    if (this.buffer[this.top] !== undefined) return false
    this.buffer[this.top] = data;
    this.top = (this.top + 1) & this.mask;
    return true
  }

  shift () {
    const last = this.buffer[this.btm];
    if (last === undefined) return undefined
    this.buffer[this.btm] = undefined;
    this.btm = (this.btm + 1) & this.mask;
    return last
  }

  isEmpty () {
    return this.buffer[this.btm] === undefined
  }
};

var fastFifo = class FastFIFO {
  constructor (hwm) {
    this.hwm = hwm || 16;
    this.head = new fixedSize(this.hwm);
    this.tail = this.head;
  }

  push (val) {
    if (!this.head.push(val)) {
      const prev = this.head;
      this.head = prev.next = new fixedSize(2 * this.head.buffer.length);
      this.head.push(val);
    }
  }

  shift () {
    const val = this.tail.shift();
    if (val === undefined && this.tail.next) {
      const next = this.tail.next;
      this.tail.next = null;
      this.tail = next;
      return this.tail.shift()
    }
    return val
  }

  isEmpty () {
    return this.head.isEmpty()
  }
};

const { EventEmitter } = require$$0$1;
const STREAM_DESTROYED = new Error('Stream was destroyed');
const PREMATURE_CLOSE = new Error('Premature close');




/* eslint-disable no-multi-spaces */

const MAX = ((1 << 25) - 1);

// Shared state
const OPENING     = 0b001;
const DESTROYING  = 0b010;
const DESTROYED   = 0b100;

const NOT_OPENING = MAX ^ OPENING;

// Read state
const READ_ACTIVE           = 0b0000000000001 << 3;
const READ_PRIMARY          = 0b0000000000010 << 3;
const READ_SYNC             = 0b0000000000100 << 3;
const READ_QUEUED           = 0b0000000001000 << 3;
const READ_RESUMED          = 0b0000000010000 << 3;
const READ_PIPE_DRAINED     = 0b0000000100000 << 3;
const READ_ENDING           = 0b0000001000000 << 3;
const READ_EMIT_DATA        = 0b0000010000000 << 3;
const READ_EMIT_READABLE    = 0b0000100000000 << 3;
const READ_EMITTED_READABLE = 0b0001000000000 << 3;
const READ_DONE             = 0b0010000000000 << 3;
const READ_NEXT_TICK        = 0b0100000000001 << 3; // also active
const READ_NEEDS_PUSH       = 0b1000000000000 << 3;

const READ_NOT_ACTIVE             = MAX ^ READ_ACTIVE;
const READ_NON_PRIMARY            = MAX ^ READ_PRIMARY;
const READ_NON_PRIMARY_AND_PUSHED = MAX ^ (READ_PRIMARY | READ_NEEDS_PUSH);
const READ_NOT_SYNC               = MAX ^ READ_SYNC;
const READ_PUSHED                 = MAX ^ READ_NEEDS_PUSH;
const READ_PAUSED                 = MAX ^ READ_RESUMED;
const READ_NOT_QUEUED             = MAX ^ (READ_QUEUED | READ_EMITTED_READABLE);
const READ_NOT_ENDING             = MAX ^ READ_ENDING;
const READ_PIPE_NOT_DRAINED       = MAX ^ (READ_RESUMED | READ_PIPE_DRAINED);
const READ_NOT_NEXT_TICK          = MAX ^ READ_NEXT_TICK;

// Write state
const WRITE_ACTIVE     = 0b000000001 << 16;
const WRITE_PRIMARY    = 0b000000010 << 16;
const WRITE_SYNC       = 0b000000100 << 16;
const WRITE_QUEUED     = 0b000001000 << 16;
const WRITE_UNDRAINED  = 0b000010000 << 16;
const WRITE_DONE       = 0b000100000 << 16;
const WRITE_EMIT_DRAIN = 0b001000000 << 16;
const WRITE_NEXT_TICK  = 0b010000001 << 16; // also active
const WRITE_FINISHING  = 0b100000000 << 16;

const WRITE_NOT_ACTIVE    = MAX ^ WRITE_ACTIVE;
const WRITE_NOT_SYNC      = MAX ^ WRITE_SYNC;
const WRITE_NON_PRIMARY   = MAX ^ WRITE_PRIMARY;
const WRITE_NOT_FINISHING = MAX ^ WRITE_FINISHING;
const WRITE_DRAINED       = MAX ^ WRITE_UNDRAINED;
const WRITE_NOT_QUEUED    = MAX ^ WRITE_QUEUED;
const WRITE_NOT_NEXT_TICK = MAX ^ WRITE_NEXT_TICK;

// Combined shared state
const ACTIVE = READ_ACTIVE | WRITE_ACTIVE;
const NOT_ACTIVE = MAX ^ ACTIVE;
const DONE = READ_DONE | WRITE_DONE;
const DESTROY_STATUS = DESTROYING | DESTROYED;
const OPEN_STATUS = DESTROY_STATUS | OPENING;
const AUTO_DESTROY = DESTROY_STATUS | DONE;
const NON_PRIMARY = WRITE_NON_PRIMARY & READ_NON_PRIMARY;
const TICKING = (WRITE_NEXT_TICK | READ_NEXT_TICK) & NOT_ACTIVE;
const ACTIVE_OR_TICKING = ACTIVE | TICKING;
const IS_OPENING = OPEN_STATUS | TICKING;

// Combined read state
const READ_PRIMARY_STATUS = OPEN_STATUS | READ_ENDING | READ_DONE;
const READ_STATUS = OPEN_STATUS | READ_DONE | READ_QUEUED;
const READ_FLOWING = READ_RESUMED | READ_PIPE_DRAINED;
const READ_ACTIVE_AND_SYNC = READ_ACTIVE | READ_SYNC;
const READ_ACTIVE_AND_SYNC_AND_NEEDS_PUSH = READ_ACTIVE | READ_SYNC | READ_NEEDS_PUSH;
const READ_PRIMARY_AND_ACTIVE = READ_PRIMARY | READ_ACTIVE;
const READ_ENDING_STATUS = OPEN_STATUS | READ_ENDING | READ_QUEUED;
const READ_EMIT_READABLE_AND_QUEUED = READ_EMIT_READABLE | READ_QUEUED;
const READ_READABLE_STATUS = OPEN_STATUS | READ_EMIT_READABLE | READ_QUEUED | READ_EMITTED_READABLE;
const SHOULD_NOT_READ = OPEN_STATUS | READ_ACTIVE | READ_ENDING | READ_DONE | READ_NEEDS_PUSH;
const READ_BACKPRESSURE_STATUS = DESTROY_STATUS | READ_ENDING | READ_DONE;

// Combined write state
const WRITE_PRIMARY_STATUS = OPEN_STATUS | WRITE_FINISHING | WRITE_DONE;
const WRITE_QUEUED_AND_UNDRAINED = WRITE_QUEUED | WRITE_UNDRAINED;
const WRITE_QUEUED_AND_ACTIVE = WRITE_QUEUED | WRITE_ACTIVE;
const WRITE_DRAIN_STATUS = WRITE_QUEUED | WRITE_UNDRAINED | OPEN_STATUS | WRITE_ACTIVE;
const WRITE_STATUS = OPEN_STATUS | WRITE_ACTIVE | WRITE_QUEUED;
const WRITE_PRIMARY_AND_ACTIVE = WRITE_PRIMARY | WRITE_ACTIVE;
const WRITE_ACTIVE_AND_SYNC = WRITE_ACTIVE | WRITE_SYNC;
const WRITE_FINISHING_STATUS = OPEN_STATUS | WRITE_FINISHING | WRITE_QUEUED;
const WRITE_BACKPRESSURE_STATUS = WRITE_UNDRAINED | DESTROY_STATUS | WRITE_FINISHING | WRITE_DONE;

const asyncIterator = Symbol.asyncIterator || Symbol('asyncIterator');

class WritableState$1 {
  constructor (stream, { highWaterMark = 16384, map = null, mapWritable, byteLength, byteLengthWritable } = {}) {
    this.stream = stream;
    this.queue = new fastFifo();
    this.highWaterMark = highWaterMark;
    this.buffered = 0;
    this.error = null;
    this.pipeline = null;
    this.byteLength = byteLengthWritable || byteLength || defaultByteLength;
    this.map = mapWritable || map;
    this.afterWrite = afterWrite$1.bind(this);
    this.afterUpdateNextTick = updateWriteNT.bind(this);
  }

  get ended () {
    return (this.stream._duplexState & WRITE_DONE) !== 0
  }

  push (data) {
    if (this.map !== null) data = this.map(data);

    this.buffered += this.byteLength(data);
    this.queue.push(data);

    if (this.buffered < this.highWaterMark) {
      this.stream._duplexState |= WRITE_QUEUED;
      return true
    }

    this.stream._duplexState |= WRITE_QUEUED_AND_UNDRAINED;
    return false
  }

  shift () {
    const data = this.queue.shift();
    const stream = this.stream;

    this.buffered -= this.byteLength(data);
    if (this.buffered === 0) stream._duplexState &= WRITE_NOT_QUEUED;

    return data
  }

  end (data) {
    if (typeof data === 'function') this.stream.once('finish', data);
    else if (data !== undefined && data !== null) this.push(data);
    this.stream._duplexState = (this.stream._duplexState | WRITE_FINISHING) & WRITE_NON_PRIMARY;
  }

  autoBatch (data, cb) {
    const buffer = [];
    const stream = this.stream;

    buffer.push(data);
    while ((stream._duplexState & WRITE_STATUS) === WRITE_QUEUED_AND_ACTIVE) {
      buffer.push(stream._writableState.shift());
    }

    if ((stream._duplexState & OPEN_STATUS) !== 0) return cb(null)
    stream._writev(buffer, cb);
  }

  update () {
    const stream = this.stream;

    while ((stream._duplexState & WRITE_STATUS) === WRITE_QUEUED) {
      const data = this.shift();
      stream._duplexState |= WRITE_ACTIVE_AND_SYNC;
      stream._write(data, this.afterWrite);
      stream._duplexState &= WRITE_NOT_SYNC;
    }

    if ((stream._duplexState & WRITE_PRIMARY_AND_ACTIVE) === 0) this.updateNonPrimary();
  }

  updateNonPrimary () {
    const stream = this.stream;

    if ((stream._duplexState & WRITE_FINISHING_STATUS) === WRITE_FINISHING) {
      stream._duplexState = (stream._duplexState | WRITE_ACTIVE) & WRITE_NOT_FINISHING;
      stream._final(afterFinal.bind(this));
      return
    }

    if ((stream._duplexState & DESTROY_STATUS) === DESTROYING) {
      if ((stream._duplexState & ACTIVE_OR_TICKING) === 0) {
        stream._duplexState |= ACTIVE;
        stream._destroy(afterDestroy.bind(this));
      }
      return
    }

    if ((stream._duplexState & IS_OPENING) === OPENING) {
      stream._duplexState = (stream._duplexState | ACTIVE) & NOT_OPENING;
      stream._open(afterOpen.bind(this));
    }
  }

  updateNextTick () {
    if ((this.stream._duplexState & WRITE_NEXT_TICK) !== 0) return
    this.stream._duplexState |= WRITE_NEXT_TICK;
    queueMicrotask_1(this.afterUpdateNextTick);
  }
}

class ReadableState$1 {
  constructor (stream, { highWaterMark = 16384, map = null, mapReadable, byteLength, byteLengthReadable } = {}) {
    this.stream = stream;
    this.queue = new fastFifo();
    this.highWaterMark = highWaterMark;
    this.buffered = 0;
    this.error = null;
    this.pipeline = null;
    this.byteLength = byteLengthReadable || byteLength || defaultByteLength;
    this.map = mapReadable || map;
    this.pipeTo = null;
    this.afterRead = afterRead.bind(this);
    this.afterUpdateNextTick = updateReadNT.bind(this);
  }

  get ended () {
    return (this.stream._duplexState & READ_DONE) !== 0
  }

  pipe (pipeTo, cb) {
    if (this.pipeTo !== null) throw new Error('Can only pipe to one destination')

    this.stream._duplexState |= READ_PIPE_DRAINED;
    this.pipeTo = pipeTo;
    this.pipeline = new Pipeline(this.stream, pipeTo, cb || null);

    if (cb) this.stream.on('error', noop$3); // We already error handle this so supress crashes

    if (isStreamx(pipeTo)) {
      pipeTo._writableState.pipeline = this.pipeline;
      if (cb) pipeTo.on('error', noop$3); // We already error handle this so supress crashes
      pipeTo.on('finish', this.pipeline.finished.bind(this.pipeline)); // TODO: just call finished from pipeTo itself
    } else {
      const onerror = this.pipeline.done.bind(this.pipeline, pipeTo);
      const onclose = this.pipeline.done.bind(this.pipeline, pipeTo, null); // onclose has a weird bool arg
      pipeTo.on('error', onerror);
      pipeTo.on('close', onclose);
      pipeTo.on('finish', this.pipeline.finished.bind(this.pipeline));
    }

    pipeTo.on('drain', afterDrain.bind(this));
    this.stream.emit('piping', pipeTo);
    pipeTo.emit('pipe', this.stream);
  }

  push (data) {
    const stream = this.stream;

    if (data === null) {
      this.highWaterMark = 0;
      stream._duplexState = (stream._duplexState | READ_ENDING) & READ_NON_PRIMARY_AND_PUSHED;
      return false
    }

    if (this.map !== null) data = this.map(data);
    this.buffered += this.byteLength(data);
    this.queue.push(data);

    stream._duplexState = (stream._duplexState | READ_QUEUED) & READ_PUSHED;

    return this.buffered < this.highWaterMark
  }

  shift () {
    const data = this.queue.shift();

    this.buffered -= this.byteLength(data);
    if (this.buffered === 0) this.stream._duplexState &= READ_NOT_QUEUED;
    return data
  }

  unshift (data) {
    let tail;
    const pending = [];

    while ((tail = this.queue.shift()) !== undefined) {
      pending.push(tail);
    }

    this.push(data);

    for (let i = 0; i < pending.length; i++) {
      this.queue.push(pending[i]);
    }
  }

  read () {
    const stream = this.stream;

    if ((stream._duplexState & READ_STATUS) === READ_QUEUED) {
      const data = this.shift();
      if ((stream._duplexState & READ_EMIT_DATA) !== 0) stream.emit('data', data);
      if (this.pipeTo !== null && this.pipeTo.write(data) === false) stream._duplexState &= READ_PIPE_NOT_DRAINED;
      return data
    }

    return null
  }

  drain () {
    const stream = this.stream;

    while ((stream._duplexState & READ_STATUS) === READ_QUEUED && (stream._duplexState & READ_FLOWING) !== 0) {
      const data = this.shift();
      if ((stream._duplexState & READ_EMIT_DATA) !== 0) stream.emit('data', data);
      if (this.pipeTo !== null && this.pipeTo.write(data) === false) stream._duplexState &= READ_PIPE_NOT_DRAINED;
    }
  }

  update () {
    const stream = this.stream;

    this.drain();

    while (this.buffered < this.highWaterMark && (stream._duplexState & SHOULD_NOT_READ) === 0) {
      stream._duplexState |= READ_ACTIVE_AND_SYNC_AND_NEEDS_PUSH;
      stream._read(this.afterRead);
      stream._duplexState &= READ_NOT_SYNC;
      if ((stream._duplexState & READ_ACTIVE) === 0) this.drain();
    }

    if ((stream._duplexState & READ_READABLE_STATUS) === READ_EMIT_READABLE_AND_QUEUED) {
      stream._duplexState |= READ_EMITTED_READABLE;
      stream.emit('readable');
    }

    if ((stream._duplexState & READ_PRIMARY_AND_ACTIVE) === 0) this.updateNonPrimary();
  }

  updateNonPrimary () {
    const stream = this.stream;

    if ((stream._duplexState & READ_ENDING_STATUS) === READ_ENDING) {
      stream._duplexState = (stream._duplexState | READ_DONE) & READ_NOT_ENDING;
      stream.emit('end');
      if ((stream._duplexState & AUTO_DESTROY) === DONE) stream._duplexState |= DESTROYING;
      if (this.pipeTo !== null) this.pipeTo.end();
    }

    if ((stream._duplexState & DESTROY_STATUS) === DESTROYING) {
      if ((stream._duplexState & ACTIVE_OR_TICKING) === 0) {
        stream._duplexState |= ACTIVE;
        stream._destroy(afterDestroy.bind(this));
      }
      return
    }

    if ((stream._duplexState & IS_OPENING) === OPENING) {
      stream._duplexState = (stream._duplexState | ACTIVE) & NOT_OPENING;
      stream._open(afterOpen.bind(this));
    }
  }

  updateNextTick () {
    if ((this.stream._duplexState & READ_NEXT_TICK) !== 0) return
    this.stream._duplexState |= READ_NEXT_TICK;
    queueMicrotask_1(this.afterUpdateNextTick);
  }
}

class TransformState {
  constructor (stream) {
    this.data = null;
    this.afterTransform = afterTransform$1.bind(stream);
    this.afterFinal = null;
  }
}

class Pipeline {
  constructor (src, dst, cb) {
    this.from = src;
    this.to = dst;
    this.afterPipe = cb;
    this.error = null;
    this.pipeToFinished = false;
  }

  finished () {
    this.pipeToFinished = true;
  }

  done (stream, err) {
    if (err) this.error = err;

    if (stream === this.to) {
      this.to = null;

      if (this.from !== null) {
        if ((this.from._duplexState & READ_DONE) === 0 || !this.pipeToFinished) {
          this.from.destroy(this.error || new Error('Writable stream closed prematurely'));
        }
        return
      }
    }

    if (stream === this.from) {
      this.from = null;

      if (this.to !== null) {
        if ((stream._duplexState & READ_DONE) === 0) {
          this.to.destroy(this.error || new Error('Readable stream closed before ending'));
        }
        return
      }
    }

    if (this.afterPipe !== null) this.afterPipe(this.error);
    this.to = this.from = this.afterPipe = null;
  }
}

function afterDrain () {
  this.stream._duplexState |= READ_PIPE_DRAINED;
  if ((this.stream._duplexState & READ_ACTIVE_AND_SYNC) === 0) this.updateNextTick();
}

function afterFinal (err) {
  const stream = this.stream;
  if (err) stream.destroy(err);
  if ((stream._duplexState & DESTROY_STATUS) === 0) {
    stream._duplexState |= WRITE_DONE;
    stream.emit('finish');
  }
  if ((stream._duplexState & AUTO_DESTROY) === DONE) {
    stream._duplexState |= DESTROYING;
  }

  stream._duplexState &= WRITE_NOT_ACTIVE;
  this.update();
}

function afterDestroy (err) {
  const stream = this.stream;

  if (!err && this.error !== STREAM_DESTROYED) err = this.error;
  if (err) stream.emit('error', err);
  stream._duplexState |= DESTROYED;
  stream.emit('close');

  const rs = stream._readableState;
  const ws = stream._writableState;

  if (rs !== null && rs.pipeline !== null) rs.pipeline.done(stream, err);
  if (ws !== null && ws.pipeline !== null) ws.pipeline.done(stream, err);
}

function afterWrite$1 (err) {
  const stream = this.stream;

  if (err) stream.destroy(err);
  stream._duplexState &= WRITE_NOT_ACTIVE;

  if ((stream._duplexState & WRITE_DRAIN_STATUS) === WRITE_UNDRAINED) {
    stream._duplexState &= WRITE_DRAINED;
    if ((stream._duplexState & WRITE_EMIT_DRAIN) === WRITE_EMIT_DRAIN) {
      stream.emit('drain');
    }
  }

  if ((stream._duplexState & WRITE_SYNC) === 0) this.update();
}

function afterRead (err) {
  if (err) this.stream.destroy(err);
  this.stream._duplexState &= READ_NOT_ACTIVE;
  if ((this.stream._duplexState & READ_SYNC) === 0) this.update();
}

function updateReadNT () {
  this.stream._duplexState &= READ_NOT_NEXT_TICK;
  this.update();
}

function updateWriteNT () {
  this.stream._duplexState &= WRITE_NOT_NEXT_TICK;
  this.update();
}

function afterOpen (err) {
  const stream = this.stream;

  if (err) stream.destroy(err);

  if ((stream._duplexState & DESTROYING) === 0) {
    if ((stream._duplexState & READ_PRIMARY_STATUS) === 0) stream._duplexState |= READ_PRIMARY;
    if ((stream._duplexState & WRITE_PRIMARY_STATUS) === 0) stream._duplexState |= WRITE_PRIMARY;
    stream.emit('open');
  }

  stream._duplexState &= NOT_ACTIVE;

  if (stream._writableState !== null) {
    stream._writableState.update();
  }

  if (stream._readableState !== null) {
    stream._readableState.update();
  }
}

function afterTransform$1 (err, data) {
  if (data !== undefined && data !== null) this.push(data);
  this._writableState.afterWrite(err);
}

class Stream extends EventEmitter {
  constructor (opts) {
    super();

    this._duplexState = 0;
    this._readableState = null;
    this._writableState = null;

    if (opts) {
      if (opts.open) this._open = opts.open;
      if (opts.destroy) this._destroy = opts.destroy;
      if (opts.predestroy) this._predestroy = opts.predestroy;
      if (opts.signal) {
        opts.signal.addEventListener('abort', abort.bind(this));
      }
    }
  }

  _open (cb) {
    cb(null);
  }

  _destroy (cb) {
    cb(null);
  }

  _predestroy () {
    // does nothing
  }

  get readable () {
    return this._readableState !== null ? true : undefined
  }

  get writable () {
    return this._writableState !== null ? true : undefined
  }

  get destroyed () {
    return (this._duplexState & DESTROYED) !== 0
  }

  get destroying () {
    return (this._duplexState & DESTROY_STATUS) !== 0
  }

  destroy (err) {
    if ((this._duplexState & DESTROY_STATUS) === 0) {
      if (!err) err = STREAM_DESTROYED;
      this._duplexState = (this._duplexState | DESTROYING) & NON_PRIMARY;
      if (this._readableState !== null) {
        this._readableState.error = err;
        this._readableState.updateNextTick();
      }
      if (this._writableState !== null) {
        this._writableState.error = err;
        this._writableState.updateNextTick();
      }
      this._predestroy();
    }
  }

  on (name, fn) {
    if (this._readableState !== null) {
      if (name === 'data') {
        this._duplexState |= (READ_EMIT_DATA | READ_RESUMED);
        this._readableState.updateNextTick();
      }
      if (name === 'readable') {
        this._duplexState |= READ_EMIT_READABLE;
        this._readableState.updateNextTick();
      }
    }

    if (this._writableState !== null) {
      if (name === 'drain') {
        this._duplexState |= WRITE_EMIT_DRAIN;
        this._writableState.updateNextTick();
      }
    }

    return super.on(name, fn)
  }
}

class Readable$1 extends Stream {
  constructor (opts) {
    super(opts);

    this._duplexState |= OPENING | WRITE_DONE;
    this._readableState = new ReadableState$1(this, opts);

    if (opts) {
      if (opts.read) this._read = opts.read;
    }
  }

  _read (cb) {
    cb(null);
  }

  pipe (dest, cb) {
    this._readableState.pipe(dest, cb);
    this._readableState.updateNextTick();
    return dest
  }

  read () {
    this._readableState.updateNextTick();
    return this._readableState.read()
  }

  push (data) {
    this._readableState.updateNextTick();
    return this._readableState.push(data)
  }

  unshift (data) {
    this._readableState.updateNextTick();
    return this._readableState.unshift(data)
  }

  resume () {
    this._duplexState |= READ_RESUMED;
    this._readableState.updateNextTick();
    return this
  }

  pause () {
    this._duplexState &= READ_PAUSED;
    return this
  }

  static _fromAsyncIterator (ite, opts) {
    let destroy;

    const rs = new Readable$1({
      ...opts,
      read (cb) {
        ite.next().then(push).then(cb.bind(null, null)).catch(cb);
      },
      predestroy () {
        destroy = ite.return();
      },
      destroy (cb) {
        destroy.then(cb.bind(null, null)).catch(cb);
      }
    });

    return rs

    function push (data) {
      if (data.done) rs.push(null);
      else rs.push(data.value);
    }
  }

  static from (data, opts) {
    if (isReadStreamx(data)) return data
    if (data[asyncIterator]) return this._fromAsyncIterator(data[asyncIterator](), opts)
    if (!Array.isArray(data)) data = data === undefined ? [] : [data];

    let i = 0;
    return new Readable$1({
      ...opts,
      read (cb) {
        this.push(i === data.length ? null : data[i++]);
        cb(null);
      }
    })
  }

  static isBackpressured (rs) {
    return (rs._duplexState & READ_BACKPRESSURE_STATUS) !== 0 || rs._readableState.buffered >= rs._readableState.highWaterMark
  }

  static isPaused (rs) {
    return (rs._duplexState & READ_RESUMED) === 0
  }

  [asyncIterator] () {
    const stream = this;

    let error = null;
    let promiseResolve = null;
    let promiseReject = null;

    this.on('error', (err) => { error = err; });
    this.on('readable', onreadable);
    this.on('close', onclose);

    return {
      [asyncIterator] () {
        return this
      },
      next () {
        return new Promise(function (resolve, reject) {
          promiseResolve = resolve;
          promiseReject = reject;
          const data = stream.read();
          if (data !== null) ondata(data);
          else if ((stream._duplexState & DESTROYED) !== 0) ondata(null);
        })
      },
      return () {
        return destroy(null)
      },
      throw (err) {
        return destroy(err)
      }
    }

    function onreadable () {
      if (promiseResolve !== null) ondata(stream.read());
    }

    function onclose () {
      if (promiseResolve !== null) ondata(null);
    }

    function ondata (data) {
      if (promiseReject === null) return
      if (error) promiseReject(error);
      else if (data === null && (stream._duplexState & READ_DONE) === 0) promiseReject(STREAM_DESTROYED);
      else promiseResolve({ value: data, done: data === null });
      promiseReject = promiseResolve = null;
    }

    function destroy (err) {
      stream.destroy(err);
      return new Promise((resolve, reject) => {
        if (stream._duplexState & DESTROYED) return resolve({ value: undefined, done: true })
        stream.once('close', function () {
          if (err) reject(err);
          else resolve({ value: undefined, done: true });
        });
      })
    }
  }
}

class Writable$1 extends Stream {
  constructor (opts) {
    super(opts);

    this._duplexState |= OPENING | READ_DONE;
    this._writableState = new WritableState$1(this, opts);

    if (opts) {
      if (opts.writev) this._writev = opts.writev;
      if (opts.write) this._write = opts.write;
      if (opts.final) this._final = opts.final;
    }
  }

  _writev (batch, cb) {
    cb(null);
  }

  _write (data, cb) {
    this._writableState.autoBatch(data, cb);
  }

  _final (cb) {
    cb(null);
  }

  static isBackpressured (ws) {
    return (ws._duplexState & WRITE_BACKPRESSURE_STATUS) !== 0
  }

  write (data) {
    this._writableState.updateNextTick();
    return this._writableState.push(data)
  }

  end (data) {
    this._writableState.updateNextTick();
    this._writableState.end(data);
    return this
  }
}

class Duplex$3 extends Readable$1 { // and Writable
  constructor (opts) {
    super(opts);

    this._duplexState = OPENING;
    this._writableState = new WritableState$1(this, opts);

    if (opts) {
      if (opts.writev) this._writev = opts.writev;
      if (opts.write) this._write = opts.write;
      if (opts.final) this._final = opts.final;
    }
  }

  _writev (batch, cb) {
    cb(null);
  }

  _write (data, cb) {
    this._writableState.autoBatch(data, cb);
  }

  _final (cb) {
    cb(null);
  }

  write (data) {
    this._writableState.updateNextTick();
    return this._writableState.push(data)
  }

  end (data) {
    this._writableState.updateNextTick();
    this._writableState.end(data);
    return this
  }
}

class Transform$1 extends Duplex$3 {
  constructor (opts) {
    super(opts);
    this._transformState = new TransformState(this);

    if (opts) {
      if (opts.transform) this._transform = opts.transform;
      if (opts.flush) this._flush = opts.flush;
    }
  }

  _write (data, cb) {
    if (this._readableState.buffered >= this._readableState.highWaterMark) {
      this._transformState.data = data;
    } else {
      this._transform(data, this._transformState.afterTransform);
    }
  }

  _read (cb) {
    if (this._transformState.data !== null) {
      const data = this._transformState.data;
      this._transformState.data = null;
      cb(null);
      this._transform(data, this._transformState.afterTransform);
    } else {
      cb(null);
    }
  }

  _transform (data, cb) {
    cb(null, data);
  }

  _flush (cb) {
    cb(null);
  }

  _final (cb) {
    this._transformState.afterFinal = cb;
    this._flush(transformAfterFlush.bind(this));
  }
}

class PassThrough$1 extends Transform$1 {}

function transformAfterFlush (err, data) {
  const cb = this._transformState.afterFinal;
  if (err) return cb(err)
  if (data !== null && data !== undefined) this.push(data);
  this.push(null);
  cb(null);
}

function pipelinePromise (...streams) {
  return new Promise((resolve, reject) => {
    return pipeline$1(...streams, (err) => {
      if (err) return reject(err)
      resolve();
    })
  })
}

function pipeline$1 (stream, ...streams) {
  const all = Array.isArray(stream) ? [...stream, ...streams] : [stream, ...streams];
  const done = (all.length && typeof all[all.length - 1] === 'function') ? all.pop() : null;

  if (all.length < 2) throw new Error('Pipeline requires at least 2 streams')

  let src = all[0];
  let dest = null;
  let error = null;

  for (let i = 1; i < all.length; i++) {
    dest = all[i];

    if (isStreamx(src)) {
      src.pipe(dest, onerror);
    } else {
      errorHandle(src, true, i > 1, onerror);
      src.pipe(dest);
    }

    src = dest;
  }

  if (done) {
    let fin = false;

    dest.on('finish', () => { fin = true; });
    dest.on('error', err => { error = error || err; });
    dest.on('close', () => done(error || (fin ? null : PREMATURE_CLOSE)));
  }

  return dest

  function errorHandle (s, rd, wr, onerror) {
    s.on('error', onerror);
    s.on('close', onclose);

    function onclose () {
      if (rd && s._readableState && !s._readableState.ended) return onerror(PREMATURE_CLOSE)
      if (wr && s._writableState && !s._writableState.ended) return onerror(PREMATURE_CLOSE)
    }
  }

  function onerror (err) {
    if (!err || error) return
    error = err;

    for (const s of all) {
      s.destroy(err);
    }
  }
}

function isStream (stream) {
  return !!stream._readableState || !!stream._writableState
}

function isStreamx (stream) {
  return typeof stream._duplexState === 'number' && isStream(stream)
}

function isReadStreamx (stream) {
  return isStreamx(stream) && stream.readable
}

function isTypedArray (data) {
  return typeof data === 'object' && data !== null && typeof data.byteLength === 'number'
}

function defaultByteLength (data) {
  return isTypedArray(data) ? data.byteLength : 1024
}

function noop$3 () {}

function abort () {
  this.destroy(new Error('Stream aborted.'));
}

var streamx = {
  pipeline: pipeline$1,
  pipelinePromise,
  isStream,
  isStreamx,
  Stream,
  Writable: Writable$1,
  Readable: Readable$1,
  Duplex: Duplex$3,
  Transform: Transform$1,
  // Export PassThrough for compatibility with Node.js core's stream module
  PassThrough: PassThrough$1
};

var global$1 = (typeof global$1 !== "undefined" ? global$1 :
  typeof self !== "undefined" ? self :
  typeof window !== "undefined" ? window : {});

var lookup = [];
var revLookup = [];
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array;
var inited = false;
function init () {
  inited = true;
  var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  for (var i = 0, len = code.length; i < len; ++i) {
    lookup[i] = code[i];
    revLookup[code.charCodeAt(i)] = i;
  }

  revLookup['-'.charCodeAt(0)] = 62;
  revLookup['_'.charCodeAt(0)] = 63;
}

function toByteArray (b64) {
  if (!inited) {
    init();
  }
  var i, j, l, tmp, placeHolders, arr;
  var len = b64.length;

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // the number of equal signs (place holders)
  // if there are two placeholders, than the two characters before it
  // represent one byte
  // if there is only one, then the three characters before it represent 2 bytes
  // this is just a cheap hack to not do indexOf twice
  placeHolders = b64[len - 2] === '=' ? 2 : b64[len - 1] === '=' ? 1 : 0;

  // base64 is 4/3 + up to two characters of the original data
  arr = new Arr(len * 3 / 4 - placeHolders);

  // if there are placeholders, only get up to the last complete 4 chars
  l = placeHolders > 0 ? len - 4 : len;

  var L = 0;

  for (i = 0, j = 0; i < l; i += 4, j += 3) {
    tmp = (revLookup[b64.charCodeAt(i)] << 18) | (revLookup[b64.charCodeAt(i + 1)] << 12) | (revLookup[b64.charCodeAt(i + 2)] << 6) | revLookup[b64.charCodeAt(i + 3)];
    arr[L++] = (tmp >> 16) & 0xFF;
    arr[L++] = (tmp >> 8) & 0xFF;
    arr[L++] = tmp & 0xFF;
  }

  if (placeHolders === 2) {
    tmp = (revLookup[b64.charCodeAt(i)] << 2) | (revLookup[b64.charCodeAt(i + 1)] >> 4);
    arr[L++] = tmp & 0xFF;
  } else if (placeHolders === 1) {
    tmp = (revLookup[b64.charCodeAt(i)] << 10) | (revLookup[b64.charCodeAt(i + 1)] << 4) | (revLookup[b64.charCodeAt(i + 2)] >> 2);
    arr[L++] = (tmp >> 8) & 0xFF;
    arr[L++] = tmp & 0xFF;
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp;
  var output = [];
  for (var i = start; i < end; i += 3) {
    tmp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2]);
    output.push(tripletToBase64(tmp));
  }
  return output.join('')
}

function fromByteArray (uint8) {
  if (!inited) {
    init();
  }
  var tmp;
  var len = uint8.length;
  var extraBytes = len % 3; // if we have 1 byte left, pad 2 bytes
  var output = '';
  var parts = [];
  var maxChunkLength = 16383; // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)));
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1];
    output += lookup[tmp >> 2];
    output += lookup[(tmp << 4) & 0x3F];
    output += '==';
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + (uint8[len - 1]);
    output += lookup[tmp >> 10];
    output += lookup[(tmp >> 4) & 0x3F];
    output += lookup[(tmp << 2) & 0x3F];
    output += '=';
  }

  parts.push(output);

  return parts.join('')
}

function read (buffer, offset, isLE, mLen, nBytes) {
  var e, m;
  var eLen = nBytes * 8 - mLen - 1;
  var eMax = (1 << eLen) - 1;
  var eBias = eMax >> 1;
  var nBits = -7;
  var i = isLE ? (nBytes - 1) : 0;
  var d = isLE ? -1 : 1;
  var s = buffer[offset + i];

  i += d;

  e = s & ((1 << (-nBits)) - 1);
  s >>= (-nBits);
  nBits += eLen;
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1);
  e >>= (-nBits);
  nBits += mLen;
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias;
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen);
    e = e - eBias;
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

function write (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c;
  var eLen = nBytes * 8 - mLen - 1;
  var eMax = (1 << eLen) - 1;
  var eBias = eMax >> 1;
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0);
  var i = isLE ? 0 : (nBytes - 1);
  var d = isLE ? 1 : -1;
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

  value = Math.abs(value);

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0;
    e = eMax;
  } else {
    e = Math.floor(Math.log(value) / Math.LN2);
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--;
      c *= 2;
    }
    if (e + eBias >= 1) {
      value += rt / c;
    } else {
      value += rt * Math.pow(2, 1 - eBias);
    }
    if (value * c >= 2) {
      e++;
      c /= 2;
    }

    if (e + eBias >= eMax) {
      m = 0;
      e = eMax;
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen);
      e = e + eBias;
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
      e = 0;
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m;
  eLen += mLen;
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128;
}

var toString = {}.toString;

var isArray = Array.isArray || function (arr) {
  return toString.call(arr) == '[object Array]';
};

/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */

var INSPECT_MAX_BYTES = 50;

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * Due to various browser bugs, sometimes the Object implementation will be used even
 * when the browser supports typed arrays.
 *
 * Note:
 *
 *   - Firefox 4-29 lacks support for adding new properties to `Uint8Array` instances,
 *     See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
 *
 *   - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
 *
 *   - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
 *     incorrect length in some situations.

 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they
 * get the Object implementation, which is slower but behaves correctly.
 */
Buffer$4.TYPED_ARRAY_SUPPORT = global$1.TYPED_ARRAY_SUPPORT !== undefined
  ? global$1.TYPED_ARRAY_SUPPORT
  : true;

function kMaxLength () {
  return Buffer$4.TYPED_ARRAY_SUPPORT
    ? 0x7fffffff
    : 0x3fffffff
}

function createBuffer (that, length) {
  if (kMaxLength() < length) {
    throw new RangeError('Invalid typed array length')
  }
  if (Buffer$4.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = new Uint8Array(length);
    that.__proto__ = Buffer$4.prototype;
  } else {
    // Fallback: Return an object instance of the Buffer class
    if (that === null) {
      that = new Buffer$4(length);
    }
    that.length = length;
  }

  return that
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer$4 (arg, encodingOrOffset, length) {
  if (!Buffer$4.TYPED_ARRAY_SUPPORT && !(this instanceof Buffer$4)) {
    return new Buffer$4(arg, encodingOrOffset, length)
  }

  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new Error(
        'If encoding is specified then the first argument must be a string'
      )
    }
    return allocUnsafe(this, arg)
  }
  return from$1(this, arg, encodingOrOffset, length)
}

Buffer$4.poolSize = 8192; // not used by this implementation

// TODO: Legacy, not needed anymore. Remove in next major version.
Buffer$4._augment = function (arr) {
  arr.__proto__ = Buffer$4.prototype;
  return arr
};

function from$1 (that, value, encodingOrOffset, length) {
  if (typeof value === 'number') {
    throw new TypeError('"value" argument must not be a number')
  }

  if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) {
    return fromArrayBuffer(that, value, encodingOrOffset, length)
  }

  if (typeof value === 'string') {
    return fromString(that, value, encodingOrOffset)
  }

  return fromObject(that, value)
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer$4.from = function (value, encodingOrOffset, length) {
  return from$1(null, value, encodingOrOffset, length)
};

if (Buffer$4.TYPED_ARRAY_SUPPORT) {
  Buffer$4.prototype.__proto__ = Uint8Array.prototype;
  Buffer$4.__proto__ = Uint8Array;
}

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be a number')
  } else if (size < 0) {
    throw new RangeError('"size" argument must not be negative')
  }
}

function alloc (that, size, fill, encoding) {
  assertSize(size);
  if (size <= 0) {
    return createBuffer(that, size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(that, size).fill(fill, encoding)
      : createBuffer(that, size).fill(fill)
  }
  return createBuffer(that, size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer$4.alloc = function (size, fill, encoding) {
  return alloc(null, size, fill, encoding)
};

function allocUnsafe (that, size) {
  assertSize(size);
  that = createBuffer(that, size < 0 ? 0 : checked(size) | 0);
  if (!Buffer$4.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < size; ++i) {
      that[i] = 0;
    }
  }
  return that
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer$4.allocUnsafe = function (size) {
  return allocUnsafe(null, size)
};
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer$4.allocUnsafeSlow = function (size) {
  return allocUnsafe(null, size)
};

function fromString (that, string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8';
  }

  if (!Buffer$4.isEncoding(encoding)) {
    throw new TypeError('"encoding" must be a valid string encoding')
  }

  var length = byteLength(string, encoding) | 0;
  that = createBuffer(that, length);

  var actual = that.write(string, encoding);

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    that = that.slice(0, actual);
  }

  return that
}

function fromArrayLike (that, array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0;
  that = createBuffer(that, length);
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255;
  }
  return that
}

function fromArrayBuffer (that, array, byteOffset, length) {
  array.byteLength; // this throws if `array` is not a valid ArrayBuffer

  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('\'offset\' is out of bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('\'length\' is out of bounds')
  }

  if (byteOffset === undefined && length === undefined) {
    array = new Uint8Array(array);
  } else if (length === undefined) {
    array = new Uint8Array(array, byteOffset);
  } else {
    array = new Uint8Array(array, byteOffset, length);
  }

  if (Buffer$4.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = array;
    that.__proto__ = Buffer$4.prototype;
  } else {
    // Fallback: Return an object instance of the Buffer class
    that = fromArrayLike(that, array);
  }
  return that
}

function fromObject (that, obj) {
  if (internalIsBuffer(obj)) {
    var len = checked(obj.length) | 0;
    that = createBuffer(that, len);

    if (that.length === 0) {
      return that
    }

    obj.copy(that, 0, 0, len);
    return that
  }

  if (obj) {
    if ((typeof ArrayBuffer !== 'undefined' &&
        obj.buffer instanceof ArrayBuffer) || 'length' in obj) {
      if (typeof obj.length !== 'number' || isnan(obj.length)) {
        return createBuffer(that, 0)
      }
      return fromArrayLike(that, obj)
    }

    if (obj.type === 'Buffer' && isArray(obj.data)) {
      return fromArrayLike(that, obj.data)
    }
  }

  throw new TypeError('First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.')
}

function checked (length) {
  // Note: cannot use `length < kMaxLength()` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= kMaxLength()) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + kMaxLength().toString(16) + ' bytes')
  }
  return length | 0
}
Buffer$4.isBuffer = isBuffer;
function internalIsBuffer (b) {
  return !!(b != null && b._isBuffer)
}

Buffer$4.compare = function compare (a, b) {
  if (!internalIsBuffer(a) || !internalIsBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length;
  var y = b.length;

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i];
      y = b[i];
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
};

Buffer$4.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
};

Buffer$4.concat = function concat (list, length) {
  if (!isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer$4.alloc(0)
  }

  var i;
  if (length === undefined) {
    length = 0;
    for (i = 0; i < list.length; ++i) {
      length += list[i].length;
    }
  }

  var buffer = Buffer$4.allocUnsafe(length);
  var pos = 0;
  for (i = 0; i < list.length; ++i) {
    var buf = list[i];
    if (!internalIsBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos);
    pos += buf.length;
  }
  return buffer
};

function byteLength (string, encoding) {
  if (internalIsBuffer(string)) {
    return string.length
  }
  if (typeof ArrayBuffer !== 'undefined' && typeof ArrayBuffer.isView === 'function' &&
      (ArrayBuffer.isView(string) || string instanceof ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    string = '' + string;
  }

  var len = string.length;
  if (len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false;
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
      case undefined:
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) return utf8ToBytes(string).length // assume utf8
        encoding = ('' + encoding).toLowerCase();
        loweredCase = true;
    }
  }
}
Buffer$4.byteLength = byteLength;

function slowToString (encoding, start, end) {
  var loweredCase = false;

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0;
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length;
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0;
  start >>>= 0;

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8';

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase();
        loweredCase = true;
    }
  }
}

// The property is used by `Buffer.isBuffer` and `is-buffer` (in Safari 5-7) to detect
// Buffer instances.
Buffer$4.prototype._isBuffer = true;

function swap (b, n, m) {
  var i = b[n];
  b[n] = b[m];
  b[m] = i;
}

Buffer$4.prototype.swap16 = function swap16 () {
  var len = this.length;
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1);
  }
  return this
};

Buffer$4.prototype.swap32 = function swap32 () {
  var len = this.length;
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3);
    swap(this, i + 1, i + 2);
  }
  return this
};

Buffer$4.prototype.swap64 = function swap64 () {
  var len = this.length;
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7);
    swap(this, i + 1, i + 6);
    swap(this, i + 2, i + 5);
    swap(this, i + 3, i + 4);
  }
  return this
};

Buffer$4.prototype.toString = function toString () {
  var length = this.length | 0;
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
};

Buffer$4.prototype.equals = function equals (b) {
  if (!internalIsBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer$4.compare(this, b) === 0
};

Buffer$4.prototype.inspect = function inspect () {
  var str = '';
  var max = INSPECT_MAX_BYTES;
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ');
    if (this.length > max) str += ' ... ';
  }
  return '<Buffer ' + str + '>'
};

Buffer$4.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (!internalIsBuffer(target)) {
    throw new TypeError('Argument must be a Buffer')
  }

  if (start === undefined) {
    start = 0;
  }
  if (end === undefined) {
    end = target ? target.length : 0;
  }
  if (thisStart === undefined) {
    thisStart = 0;
  }
  if (thisEnd === undefined) {
    thisEnd = this.length;
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0;
  end >>>= 0;
  thisStart >>>= 0;
  thisEnd >>>= 0;

  if (this === target) return 0

  var x = thisEnd - thisStart;
  var y = end - start;
  var len = Math.min(x, y);

  var thisCopy = this.slice(thisStart, thisEnd);
  var targetCopy = target.slice(start, end);

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i];
      y = targetCopy[i];
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
};

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset;
    byteOffset = 0;
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff;
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000;
  }
  byteOffset = +byteOffset;  // Coerce to Number.
  if (isNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1);
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset;
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1;
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0;
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer$4.from(val, encoding);
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (internalIsBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF; // Search for a byte value [0-255]
    if (Buffer$4.TYPED_ARRAY_SUPPORT &&
        typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1;
  var arrLength = arr.length;
  var valLength = val.length;

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase();
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2;
      arrLength /= 2;
      valLength /= 2;
      byteOffset /= 2;
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i;
  if (dir) {
    var foundIndex = -1;
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i;
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex;
        foundIndex = -1;
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength;
    for (i = byteOffset; i >= 0; i--) {
      var found = true;
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false;
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer$4.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
};

Buffer$4.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
};

Buffer$4.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
};

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0;
  var remaining = buf.length - offset;
  if (!length) {
    length = remaining;
  } else {
    length = Number(length);
    if (length > remaining) {
      length = remaining;
    }
  }

  // must be an even number of digits
  var strLen = string.length;
  if (strLen % 2 !== 0) throw new TypeError('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2;
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16);
    if (isNaN(parsed)) return i
    buf[offset + i] = parsed;
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer$4.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8';
    length = this.length;
    offset = 0;
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset;
    length = this.length;
    offset = 0;
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset | 0;
    if (isFinite(length)) {
      length = length | 0;
      if (encoding === undefined) encoding = 'utf8';
    } else {
      encoding = length;
      length = undefined;
    }
  // legacy write(string, encoding, offset, length) - remove in v0.13
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset;
  if (length === undefined || length > remaining) length = remaining;

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8';

  var loweredCase = false;
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase();
        loweredCase = true;
    }
  }
};

Buffer$4.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
};

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return fromByteArray(buf)
  } else {
    return fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end);
  var res = [];

  var i = start;
  while (i < end) {
    var firstByte = buf[i];
    var codePoint = null;
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
      : (firstByte > 0xBF) ? 2
      : 1;

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint;

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte;
          }
          break
        case 2:
          secondByte = buf[i + 1];
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F);
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint;
            }
          }
          break
        case 3:
          secondByte = buf[i + 1];
          thirdByte = buf[i + 2];
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F);
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint;
            }
          }
          break
        case 4:
          secondByte = buf[i + 1];
          thirdByte = buf[i + 2];
          fourthByte = buf[i + 3];
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F);
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint;
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD;
      bytesPerSequence = 1;
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000;
      res.push(codePoint >>> 10 & 0x3FF | 0xD800);
      codePoint = 0xDC00 | codePoint & 0x3FF;
    }

    res.push(codePoint);
    i += bytesPerSequence;
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000;

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length;
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = '';
  var i = 0;
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    );
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = '';
  end = Math.min(buf.length, end);

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F);
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = '';
  end = Math.min(buf.length, end);

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i]);
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length;

  if (!start || start < 0) start = 0;
  if (!end || end < 0 || end > len) end = len;

  var out = '';
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i]);
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end);
  var res = '';
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256);
  }
  return res
}

Buffer$4.prototype.slice = function slice (start, end) {
  var len = this.length;
  start = ~~start;
  end = end === undefined ? len : ~~end;

  if (start < 0) {
    start += len;
    if (start < 0) start = 0;
  } else if (start > len) {
    start = len;
  }

  if (end < 0) {
    end += len;
    if (end < 0) end = 0;
  } else if (end > len) {
    end = len;
  }

  if (end < start) end = start;

  var newBuf;
  if (Buffer$4.TYPED_ARRAY_SUPPORT) {
    newBuf = this.subarray(start, end);
    newBuf.__proto__ = Buffer$4.prototype;
  } else {
    var sliceLen = end - start;
    newBuf = new Buffer$4(sliceLen, undefined);
    for (var i = 0; i < sliceLen; ++i) {
      newBuf[i] = this[i + start];
    }
  }

  return newBuf
};

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer$4.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset | 0;
  byteLength = byteLength | 0;
  if (!noAssert) checkOffset(offset, byteLength, this.length);

  var val = this[offset];
  var mul = 1;
  var i = 0;
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul;
  }

  return val
};

Buffer$4.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset | 0;
  byteLength = byteLength | 0;
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length);
  }

  var val = this[offset + --byteLength];
  var mul = 1;
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul;
  }

  return val
};

Buffer$4.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length);
  return this[offset]
};

Buffer$4.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length);
  return this[offset] | (this[offset + 1] << 8)
};

Buffer$4.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length);
  return (this[offset] << 8) | this[offset + 1]
};

Buffer$4.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length);

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
};

Buffer$4.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length);

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
};

Buffer$4.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset | 0;
  byteLength = byteLength | 0;
  if (!noAssert) checkOffset(offset, byteLength, this.length);

  var val = this[offset];
  var mul = 1;
  var i = 0;
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul;
  }
  mul *= 0x80;

  if (val >= mul) val -= Math.pow(2, 8 * byteLength);

  return val
};

Buffer$4.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset | 0;
  byteLength = byteLength | 0;
  if (!noAssert) checkOffset(offset, byteLength, this.length);

  var i = byteLength;
  var mul = 1;
  var val = this[offset + --i];
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul;
  }
  mul *= 0x80;

  if (val >= mul) val -= Math.pow(2, 8 * byteLength);

  return val
};

Buffer$4.prototype.readInt8 = function readInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length);
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
};

Buffer$4.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length);
  var val = this[offset] | (this[offset + 1] << 8);
  return (val & 0x8000) ? val | 0xFFFF0000 : val
};

Buffer$4.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length);
  var val = this[offset + 1] | (this[offset] << 8);
  return (val & 0x8000) ? val | 0xFFFF0000 : val
};

Buffer$4.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length);

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
};

Buffer$4.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length);

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
};

Buffer$4.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length);
  return read(this, offset, true, 23, 4)
};

Buffer$4.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length);
  return read(this, offset, false, 23, 4)
};

Buffer$4.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length);
  return read(this, offset, true, 52, 8)
};

Buffer$4.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length);
  return read(this, offset, false, 52, 8)
};

function checkInt (buf, value, offset, ext, max, min) {
  if (!internalIsBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer$4.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value;
  offset = offset | 0;
  byteLength = byteLength | 0;
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1;
    checkInt(this, value, offset, byteLength, maxBytes, 0);
  }

  var mul = 1;
  var i = 0;
  this[offset] = value & 0xFF;
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF;
  }

  return offset + byteLength
};

Buffer$4.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value;
  offset = offset | 0;
  byteLength = byteLength | 0;
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1;
    checkInt(this, value, offset, byteLength, maxBytes, 0);
  }

  var i = byteLength - 1;
  var mul = 1;
  this[offset + i] = value & 0xFF;
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF;
  }

  return offset + byteLength
};

Buffer$4.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0);
  if (!Buffer$4.TYPED_ARRAY_SUPPORT) value = Math.floor(value);
  this[offset] = (value & 0xff);
  return offset + 1
};

function objectWriteUInt16 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffff + value + 1;
  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; ++i) {
    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
      (littleEndian ? i : 1 - i) * 8;
  }
}

Buffer$4.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0);
  if (Buffer$4.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff);
    this[offset + 1] = (value >>> 8);
  } else {
    objectWriteUInt16(this, value, offset, true);
  }
  return offset + 2
};

Buffer$4.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0);
  if (Buffer$4.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8);
    this[offset + 1] = (value & 0xff);
  } else {
    objectWriteUInt16(this, value, offset, false);
  }
  return offset + 2
};

function objectWriteUInt32 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffffffff + value + 1;
  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; ++i) {
    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff;
  }
}

Buffer$4.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0);
  if (Buffer$4.TYPED_ARRAY_SUPPORT) {
    this[offset + 3] = (value >>> 24);
    this[offset + 2] = (value >>> 16);
    this[offset + 1] = (value >>> 8);
    this[offset] = (value & 0xff);
  } else {
    objectWriteUInt32(this, value, offset, true);
  }
  return offset + 4
};

Buffer$4.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0);
  if (Buffer$4.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24);
    this[offset + 1] = (value >>> 16);
    this[offset + 2] = (value >>> 8);
    this[offset + 3] = (value & 0xff);
  } else {
    objectWriteUInt32(this, value, offset, false);
  }
  return offset + 4
};

Buffer$4.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1);

    checkInt(this, value, offset, byteLength, limit - 1, -limit);
  }

  var i = 0;
  var mul = 1;
  var sub = 0;
  this[offset] = value & 0xFF;
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1;
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF;
  }

  return offset + byteLength
};

Buffer$4.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1);

    checkInt(this, value, offset, byteLength, limit - 1, -limit);
  }

  var i = byteLength - 1;
  var mul = 1;
  var sub = 0;
  this[offset + i] = value & 0xFF;
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1;
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF;
  }

  return offset + byteLength
};

Buffer$4.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80);
  if (!Buffer$4.TYPED_ARRAY_SUPPORT) value = Math.floor(value);
  if (value < 0) value = 0xff + value + 1;
  this[offset] = (value & 0xff);
  return offset + 1
};

Buffer$4.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000);
  if (Buffer$4.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff);
    this[offset + 1] = (value >>> 8);
  } else {
    objectWriteUInt16(this, value, offset, true);
  }
  return offset + 2
};

Buffer$4.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000);
  if (Buffer$4.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8);
    this[offset + 1] = (value & 0xff);
  } else {
    objectWriteUInt16(this, value, offset, false);
  }
  return offset + 2
};

Buffer$4.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);
  if (Buffer$4.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff);
    this[offset + 1] = (value >>> 8);
    this[offset + 2] = (value >>> 16);
    this[offset + 3] = (value >>> 24);
  } else {
    objectWriteUInt32(this, value, offset, true);
  }
  return offset + 4
};

Buffer$4.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);
  if (value < 0) value = 0xffffffff + value + 1;
  if (Buffer$4.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24);
    this[offset + 1] = (value >>> 16);
    this[offset + 2] = (value >>> 8);
    this[offset + 3] = (value & 0xff);
  } else {
    objectWriteUInt32(this, value, offset, false);
  }
  return offset + 4
};

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4);
  }
  write(buf, value, offset, littleEndian, 23, 4);
  return offset + 4
}

Buffer$4.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
};

Buffer$4.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
};

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8);
  }
  write(buf, value, offset, littleEndian, 52, 8);
  return offset + 8
}

Buffer$4.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
};

Buffer$4.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
};

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer$4.prototype.copy = function copy (target, targetStart, start, end) {
  if (!start) start = 0;
  if (!end && end !== 0) end = this.length;
  if (targetStart >= target.length) targetStart = target.length;
  if (!targetStart) targetStart = 0;
  if (end > 0 && end < start) end = start;

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length;
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start;
  }

  var len = end - start;
  var i;

  if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start];
    }
  } else if (len < 1000 || !Buffer$4.TYPED_ARRAY_SUPPORT) {
    // ascending copy from start
    for (i = 0; i < len; ++i) {
      target[i + targetStart] = this[i + start];
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, start + len),
      targetStart
    );
  }

  return len
};

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer$4.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start;
      start = 0;
      end = this.length;
    } else if (typeof end === 'string') {
      encoding = end;
      end = this.length;
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0);
      if (code < 256) {
        val = code;
      }
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer$4.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
  } else if (typeof val === 'number') {
    val = val & 255;
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0;
  end = end === undefined ? this.length : end >>> 0;

  if (!val) val = 0;

  var i;
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val;
    }
  } else {
    var bytes = internalIsBuffer(val)
      ? val
      : utf8ToBytes(new Buffer$4(val, encoding).toString());
    var len = bytes.length;
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len];
    }
  }

  return this
};

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g;

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '');
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '=';
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity;
  var codePoint;
  var length = string.length;
  var leadSurrogate = null;
  var bytes = [];

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i);

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
          continue
        }

        // valid lead
        leadSurrogate = codePoint;

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
        leadSurrogate = codePoint;
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000;
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
    }

    leadSurrogate = null;

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint);
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      );
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      );
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      );
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = [];
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF);
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo;
  var byteArray = [];
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i);
    hi = c >> 8;
    lo = c % 256;
    byteArray.push(lo);
    byteArray.push(hi);
  }

  return byteArray
}


function base64ToBytes (str) {
  return toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i];
  }
  return i
}

function isnan (val) {
  return val !== val // eslint-disable-line no-self-compare
}


// the following is from is-buffer, also by Feross Aboukhadijeh and with same lisence
// The _isBuffer check is for Safari 5-7 support, because it's missing
// Object.prototype.constructor. Remove this eventually
function isBuffer(obj) {
  return obj != null && (!!obj._isBuffer || isFastBuffer(obj) || isSlowBuffer(obj))
}

function isFastBuffer (obj) {
  return !!obj.constructor && typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj)
}

// For Node v0.10 support. Remove this eventually.
function isSlowBuffer (obj) {
  return typeof obj.readFloatLE === 'function' && typeof obj.slice === 'function' && isFastBuffer(obj.slice(0, 0))
}

class Tools {
    static readVint(buffer, start = 0) {
        const length = 8 - Math.floor(Math.log2(buffer[start]));
        if (length > 8) {
            const number = Tools.readHexString(buffer, start, start + length);
            throw new Error(`Unrepresentable length: ${length} ${number}`);
        }
        if (isNaN(length) || start + length > buffer.length) {
            return null;
        }
        if (length === 8 && buffer[start + 1] >= 0x20 && buffer.subarray(start + 2, start + 8).some(i => i > 0x00)) {
            return {
                length: 8,
                value: -1
            };
        }
        let value = buffer[start] & ((1 << (8 - length)) - 1);
        for (let i = 1; i < length; i += 1) {
            value *= Math.pow(2, 8);
            value += buffer[start + i];
        }
        if (value === (Math.pow(2, (length * 7)) - 1)) {
            value = -1;
        }
        return {
            length,
            value,
        };
    }
    static writeVint(value, desiredLength) {
        if (value < 0 || value > (Math.pow(2, 53))) {
            throw new Error(`Unrepresentable value: ${value}`);
        }
        let length = desiredLength;
        if (!length) {
            for (length = 1; length <= 8; length += 1) {
                if (value < Math.pow(2, (7 * length)) - 1) {
                    break;
                }
            }
        }
        const buffer = Buffer$4.alloc(length);
        let val = value;
        for (let i = 1; i <= length; i += 1) {
            const b = val & 0xff;
            buffer[length - i] = b;
            val -= b;
            val /= Math.pow(2, 8);
        }
        buffer[0] |= 1 << (8 - length);
        return buffer;
    }
    static padStart(val) {
        if (val.length == 0) {
            return '00';
        }
        if (val.length == 1) {
            return '0' + val;
        }
        return val;
    }
    static readHexString(buff, start = 0, end = buff.byteLength) {
        return Array.from(buff.subarray(start, end))
            .map(q => Number(q).toString(16))
            .reduce((acc, current) => `${acc}${this.padStart(current)}`, '');
    }
    static readUtf8(buff) {
        try {
            return Buffer$4.from(buff).toString('utf8');
        }
        catch (exception) {
            return null;
        }
    }
    static readUnsigned(buff) {
        const b = new DataView(buff.buffer, buff.byteOffset, buff.byteLength);
        switch (buff.byteLength) {
            case 1:
                return b.getUint8(0);
            case 2:
                return b.getUint16(0);
            case 4:
                return b.getUint32(0);
        }
        if (buff.byteLength <= 6) {
            return buff.reduce((acc, current) => acc * 256 + current, 0);
        }
        var hex = Tools.readHexString(buff, 0, buff.byteLength);
        var num = parseInt(hex, 16);
        if (num <= Math.pow(256, 6)) {
            return num;
        }
        return hex;
    }
    static writeUnsigned(num) {
        if (typeof num === 'string') {
            return Buffer$4.from(num, 'hex');
        }
        else {
            var buf = Buffer$4.alloc(6);
            buf.fill(0);
            buf.writeUIntBE(num, 0, 6);
            let firstValueIndex = buf.findIndex(b => b !== 0);
            if (firstValueIndex === -1) {
                firstValueIndex = buf.length - 1;
            }
            let ret = buf.slice(firstValueIndex);
            return ret;
        }
    }
    static readSigned(buff) {
        const b = new DataView(buff.buffer, buff.byteOffset, buff.byteLength);
        switch (buff.byteLength) {
            case 1:
                return b.getInt8(0);
            case 2:
                return b.getInt16(0);
            case 4:
                return b.getInt32(0);
            default:
                return NaN;
        }
    }
    static writeSigned(num) {
        var buf = Buffer$4.alloc(8);
        buf.writeInt32BE(num, 0);
        return buf;
    }
    static readFloat(buff) {
        const b = new DataView(buff.buffer, buff.byteOffset, buff.byteLength);
        switch (buff.byteLength) {
            case 4:
                return b.getFloat32(0);
            case 8:
                return b.getFloat64(0);
            default:
                return NaN;
        }
    }
    static writeFloat(num) {
        let buf = Buffer$4.alloc(8);
        let written = buf.writeFloatBE(num, 0);
        if (written <= 4) {
            buf = buf.slice(0, 4);
        }
        return buf;
    }
}
var Tools_1 = Tools;

var tools = /*#__PURE__*/Object.defineProperty({
	Tools: Tools_1
}, '__esModule', {value: true});

var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function getAugmentedNamespace(n) {
	if (n.__esModule) return n;
	var a = Object.defineProperty({}, '__esModule', {value: true});
	Object.keys(n).forEach(function (k) {
		var d = Object.getOwnPropertyDescriptor(n, k);
		Object.defineProperty(a, k, d.get ? d : {
			enumerable: true,
			get: function () {
				return n[k];
			}
		});
	});
	return a;
}

function createCommonjsModule(fn) {
  var module = { exports: {} };
	return fn(module, module.exports), module.exports;
}

var EbmlElementType_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });
(function (EbmlElementType) {
    EbmlElementType["Master"] = "m";
    EbmlElementType["UnsignedInt"] = "u";
    EbmlElementType["Integer"] = "i";
    EbmlElementType["String"] = "s";
    EbmlElementType["UTF8"] = "8";
    EbmlElementType["Binary"] = "b";
    EbmlElementType["Float"] = "f";
    EbmlElementType["Date"] = "d";
})(exports.EbmlElementType || (exports.EbmlElementType = {}));
});

var EbmlTagPosition_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });
(function (EbmlTagPosition) {
    EbmlTagPosition[EbmlTagPosition["Start"] = 0] = "Start";
    EbmlTagPosition[EbmlTagPosition["Content"] = 1] = "Content";
    EbmlTagPosition[EbmlTagPosition["End"] = 2] = "End";
})(exports.EbmlTagPosition || (exports.EbmlTagPosition = {}));
});

var EbmlTagId_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });
(function (EbmlTagId) {
    EbmlTagId[EbmlTagId["ChapterDisplay"] = 128] = "ChapterDisplay";
    EbmlTagId[EbmlTagId["TrackType"] = 131] = "TrackType";
    EbmlTagId[EbmlTagId["ChapString"] = 133] = "ChapString";
    EbmlTagId[EbmlTagId["CodecID"] = 134] = "CodecID";
    EbmlTagId[EbmlTagId["FlagDefault"] = 136] = "FlagDefault";
    EbmlTagId[EbmlTagId["ChapterTrackNumber"] = 137] = "ChapterTrackNumber";
    EbmlTagId[EbmlTagId["ChapterTimeStart"] = 145] = "ChapterTimeStart";
    EbmlTagId[EbmlTagId["ChapterTimeEnd"] = 146] = "ChapterTimeEnd";
    EbmlTagId[EbmlTagId["CueRefTime"] = 150] = "CueRefTime";
    EbmlTagId[EbmlTagId["CueRefCluster"] = 151] = "CueRefCluster";
    EbmlTagId[EbmlTagId["ChapterFlagHidden"] = 152] = "ChapterFlagHidden";
    EbmlTagId[EbmlTagId["ContentCompAlgo"] = 16980] = "ContentCompAlgo";
    EbmlTagId[EbmlTagId["ContentCompSettings"] = 16981] = "ContentCompSettings";
    EbmlTagId[EbmlTagId["DocType"] = 17026] = "DocType";
    EbmlTagId[EbmlTagId["DocTypeReadVersion"] = 17029] = "DocTypeReadVersion";
    EbmlTagId[EbmlTagId["EBMLVersion"] = 17030] = "EBMLVersion";
    EbmlTagId[EbmlTagId["DocTypeVersion"] = 17031] = "DocTypeVersion";
    EbmlTagId[EbmlTagId["SegmentFamily"] = 17476] = "SegmentFamily";
    EbmlTagId[EbmlTagId["DateUTC"] = 17505] = "DateUTC";
    EbmlTagId[EbmlTagId["TagDefault"] = 17540] = "TagDefault";
    EbmlTagId[EbmlTagId["TagBinary"] = 17541] = "TagBinary";
    EbmlTagId[EbmlTagId["TagString"] = 17543] = "TagString";
    EbmlTagId[EbmlTagId["Duration"] = 17545] = "Duration";
    EbmlTagId[EbmlTagId["ChapterFlagEnabled"] = 17816] = "ChapterFlagEnabled";
    EbmlTagId[EbmlTagId["FileMimeType"] = 18016] = "FileMimeType";
    EbmlTagId[EbmlTagId["FileUsedStartTime"] = 18017] = "FileUsedStartTime";
    EbmlTagId[EbmlTagId["FileUsedEndTime"] = 18018] = "FileUsedEndTime";
    EbmlTagId[EbmlTagId["FileReferral"] = 18037] = "FileReferral";
    EbmlTagId[EbmlTagId["ContentEncodingOrder"] = 20529] = "ContentEncodingOrder";
    EbmlTagId[EbmlTagId["ContentEncodingScope"] = 20530] = "ContentEncodingScope";
    EbmlTagId[EbmlTagId["ContentEncodingType"] = 20531] = "ContentEncodingType";
    EbmlTagId[EbmlTagId["ContentCompression"] = 20532] = "ContentCompression";
    EbmlTagId[EbmlTagId["ContentEncryption"] = 20533] = "ContentEncryption";
    EbmlTagId[EbmlTagId["CueBlockNumber"] = 21368] = "CueBlockNumber";
    EbmlTagId[EbmlTagId["ChapterStringUID"] = 22100] = "ChapterStringUID";
    EbmlTagId[EbmlTagId["WritingApp"] = 22337] = "WritingApp";
    EbmlTagId[EbmlTagId["SilentTracks"] = 22612] = "SilentTracks";
    EbmlTagId[EbmlTagId["ContentEncoding"] = 25152] = "ContentEncoding";
    EbmlTagId[EbmlTagId["BitDepth"] = 25188] = "BitDepth";
    EbmlTagId[EbmlTagId["SignedElement"] = 25906] = "SignedElement";
    EbmlTagId[EbmlTagId["TrackTranslate"] = 26148] = "TrackTranslate";
    EbmlTagId[EbmlTagId["ChapProcessCommand"] = 26897] = "ChapProcessCommand";
    EbmlTagId[EbmlTagId["ChapProcessTime"] = 26914] = "ChapProcessTime";
    EbmlTagId[EbmlTagId["ChapterTranslate"] = 26916] = "ChapterTranslate";
    EbmlTagId[EbmlTagId["ChapProcessData"] = 26931] = "ChapProcessData";
    EbmlTagId[EbmlTagId["ChapProcess"] = 26948] = "ChapProcess";
    EbmlTagId[EbmlTagId["ChapProcessCodecID"] = 26965] = "ChapProcessCodecID";
    EbmlTagId[EbmlTagId["Tag"] = 29555] = "Tag";
    EbmlTagId[EbmlTagId["SegmentFilename"] = 29572] = "SegmentFilename";
    EbmlTagId[EbmlTagId["AttachmentLink"] = 29766] = "AttachmentLink";
    EbmlTagId[EbmlTagId["CodecName"] = 2459272] = "CodecName";
    EbmlTagId[EbmlTagId["Segment"] = 408125543] = "Segment";
    EbmlTagId[EbmlTagId["TagLanguage"] = 17530] = "TagLanguage";
    EbmlTagId[EbmlTagId["TagName"] = 17827] = "TagName";
    EbmlTagId[EbmlTagId["SimpleTag"] = 26568] = "SimpleTag";
    EbmlTagId[EbmlTagId["TagAttachmentUID"] = 25542] = "TagAttachmentUID";
    EbmlTagId[EbmlTagId["TagChapterUID"] = 25540] = "TagChapterUID";
    EbmlTagId[EbmlTagId["TagEditionUID"] = 25545] = "TagEditionUID";
    EbmlTagId[EbmlTagId["TagTrackUID"] = 25541] = "TagTrackUID";
    EbmlTagId[EbmlTagId["TargetType"] = 25546] = "TargetType";
    EbmlTagId[EbmlTagId["TargetTypeValue"] = 26826] = "TargetTypeValue";
    EbmlTagId[EbmlTagId["Targets"] = 25536] = "Targets";
    EbmlTagId[EbmlTagId["Tags"] = 307544935] = "Tags";
    EbmlTagId[EbmlTagId["ChapProcessPrivate"] = 17677] = "ChapProcessPrivate";
    EbmlTagId[EbmlTagId["ChapCountry"] = 17278] = "ChapCountry";
    EbmlTagId[EbmlTagId["ChapLanguage"] = 17276] = "ChapLanguage";
    EbmlTagId[EbmlTagId["ChapterTrack"] = 143] = "ChapterTrack";
    EbmlTagId[EbmlTagId["ChapterPhysicalEquiv"] = 25539] = "ChapterPhysicalEquiv";
    EbmlTagId[EbmlTagId["ChapterSegmentEditionUID"] = 28348] = "ChapterSegmentEditionUID";
    EbmlTagId[EbmlTagId["ChapterSegmentUID"] = 28263] = "ChapterSegmentUID";
    EbmlTagId[EbmlTagId["ChapterUID"] = 29636] = "ChapterUID";
    EbmlTagId[EbmlTagId["ChapterAtom"] = 182] = "ChapterAtom";
    EbmlTagId[EbmlTagId["EditionFlagOrdered"] = 17885] = "EditionFlagOrdered";
    EbmlTagId[EbmlTagId["EditionFlagDefault"] = 17883] = "EditionFlagDefault";
    EbmlTagId[EbmlTagId["EditionFlagHidden"] = 17853] = "EditionFlagHidden";
    EbmlTagId[EbmlTagId["EditionUID"] = 17852] = "EditionUID";
    EbmlTagId[EbmlTagId["EditionEntry"] = 17849] = "EditionEntry";
    EbmlTagId[EbmlTagId["Chapters"] = 272869232] = "Chapters";
    EbmlTagId[EbmlTagId["FileUID"] = 18094] = "FileUID";
    EbmlTagId[EbmlTagId["FileData"] = 18012] = "FileData";
    EbmlTagId[EbmlTagId["FileName"] = 18030] = "FileName";
    EbmlTagId[EbmlTagId["FileDescription"] = 18046] = "FileDescription";
    EbmlTagId[EbmlTagId["AttachedFile"] = 24999] = "AttachedFile";
    EbmlTagId[EbmlTagId["Attachments"] = 423732329] = "Attachments";
    EbmlTagId[EbmlTagId["CueRefCodecState"] = 235] = "CueRefCodecState";
    EbmlTagId[EbmlTagId["CueRefNumber"] = 21343] = "CueRefNumber";
    EbmlTagId[EbmlTagId["CueReference"] = 219] = "CueReference";
    EbmlTagId[EbmlTagId["CueCodecState"] = 234] = "CueCodecState";
    EbmlTagId[EbmlTagId["CueDuration"] = 178] = "CueDuration";
    EbmlTagId[EbmlTagId["CueRelativePosition"] = 240] = "CueRelativePosition";
    EbmlTagId[EbmlTagId["CueClusterPosition"] = 241] = "CueClusterPosition";
    EbmlTagId[EbmlTagId["CueTrack"] = 247] = "CueTrack";
    EbmlTagId[EbmlTagId["CueTrackPositions"] = 183] = "CueTrackPositions";
    EbmlTagId[EbmlTagId["CueTime"] = 179] = "CueTime";
    EbmlTagId[EbmlTagId["CuePoint"] = 187] = "CuePoint";
    EbmlTagId[EbmlTagId["Cues"] = 475249515] = "Cues";
    EbmlTagId[EbmlTagId["AESSettingsCipherMode"] = 18408] = "AESSettingsCipherMode";
    EbmlTagId[EbmlTagId["ContentEncAESSettings"] = 18407] = "ContentEncAESSettings";
    EbmlTagId[EbmlTagId["ContentSigHashAlgo"] = 18406] = "ContentSigHashAlgo";
    EbmlTagId[EbmlTagId["ContentSigAlgo"] = 18405] = "ContentSigAlgo";
    EbmlTagId[EbmlTagId["ContentSigKeyID"] = 18404] = "ContentSigKeyID";
    EbmlTagId[EbmlTagId["ContentSignature"] = 18403] = "ContentSignature";
    EbmlTagId[EbmlTagId["ContentEncKeyID"] = 18402] = "ContentEncKeyID";
    EbmlTagId[EbmlTagId["ContentEncAlgo"] = 18401] = "ContentEncAlgo";
    EbmlTagId[EbmlTagId["ContentEncodings"] = 28032] = "ContentEncodings";
    EbmlTagId[EbmlTagId["TrickMasterTrackSegmentUID"] = 196] = "TrickMasterTrackSegmentUID";
    EbmlTagId[EbmlTagId["TrickMasterTrackUID"] = 199] = "TrickMasterTrackUID";
    EbmlTagId[EbmlTagId["TrickTrackFlag"] = 198] = "TrickTrackFlag";
    EbmlTagId[EbmlTagId["TrickTrackSegmentUID"] = 193] = "TrickTrackSegmentUID";
    EbmlTagId[EbmlTagId["TrickTrackUID"] = 192] = "TrickTrackUID";
    EbmlTagId[EbmlTagId["TrackJoinUID"] = 237] = "TrackJoinUID";
    EbmlTagId[EbmlTagId["TrackJoinBlocks"] = 233] = "TrackJoinBlocks";
    EbmlTagId[EbmlTagId["TrackPlaneType"] = 230] = "TrackPlaneType";
    EbmlTagId[EbmlTagId["TrackPlaneUID"] = 229] = "TrackPlaneUID";
    EbmlTagId[EbmlTagId["TrackPlane"] = 228] = "TrackPlane";
    EbmlTagId[EbmlTagId["TrackCombinePlanes"] = 227] = "TrackCombinePlanes";
    EbmlTagId[EbmlTagId["TrackOperation"] = 226] = "TrackOperation";
    EbmlTagId[EbmlTagId["ChannelPositions"] = 32123] = "ChannelPositions";
    EbmlTagId[EbmlTagId["Channels"] = 159] = "Channels";
    EbmlTagId[EbmlTagId["OutputSamplingFrequency"] = 30901] = "OutputSamplingFrequency";
    EbmlTagId[EbmlTagId["SamplingFrequency"] = 181] = "SamplingFrequency";
    EbmlTagId[EbmlTagId["Audio"] = 225] = "Audio";
    EbmlTagId[EbmlTagId["FrameRate"] = 2327523] = "FrameRate";
    EbmlTagId[EbmlTagId["GammaValue"] = 3126563] = "GammaValue";
    EbmlTagId[EbmlTagId["ColourSpace"] = 3061028] = "ColourSpace";
    EbmlTagId[EbmlTagId["AspectRatioType"] = 21683] = "AspectRatioType";
    EbmlTagId[EbmlTagId["DisplayUnit"] = 21682] = "DisplayUnit";
    EbmlTagId[EbmlTagId["DisplayHeight"] = 21690] = "DisplayHeight";
    EbmlTagId[EbmlTagId["DisplayWidth"] = 21680] = "DisplayWidth";
    EbmlTagId[EbmlTagId["PixelCropRight"] = 21725] = "PixelCropRight";
    EbmlTagId[EbmlTagId["PixelCropLeft"] = 21708] = "PixelCropLeft";
    EbmlTagId[EbmlTagId["PixelCropTop"] = 21691] = "PixelCropTop";
    EbmlTagId[EbmlTagId["PixelCropBottom"] = 21674] = "PixelCropBottom";
    EbmlTagId[EbmlTagId["PixelHeight"] = 186] = "PixelHeight";
    EbmlTagId[EbmlTagId["PixelWidth"] = 176] = "PixelWidth";
    EbmlTagId[EbmlTagId["OldStereoMode"] = 21433] = "OldStereoMode";
    EbmlTagId[EbmlTagId["AlphaMode"] = 21440] = "AlphaMode";
    EbmlTagId[EbmlTagId["StereoMode"] = 21432] = "StereoMode";
    EbmlTagId[EbmlTagId["FlagInterlaced"] = 154] = "FlagInterlaced";
    EbmlTagId[EbmlTagId["Video"] = 224] = "Video";
    EbmlTagId[EbmlTagId["TrackTranslateTrackID"] = 26277] = "TrackTranslateTrackID";
    EbmlTagId[EbmlTagId["TrackTranslateCodec"] = 26303] = "TrackTranslateCodec";
    EbmlTagId[EbmlTagId["TrackTranslateEditionUID"] = 26364] = "TrackTranslateEditionUID";
    EbmlTagId[EbmlTagId["SeekPreRoll"] = 22203] = "SeekPreRoll";
    EbmlTagId[EbmlTagId["CodecDelay"] = 22186] = "CodecDelay";
    EbmlTagId[EbmlTagId["TrackOverlay"] = 28587] = "TrackOverlay";
    EbmlTagId[EbmlTagId["CodecDecodeAll"] = 170] = "CodecDecodeAll";
    EbmlTagId[EbmlTagId["CodecDownloadURL"] = 2536000] = "CodecDownloadURL";
    EbmlTagId[EbmlTagId["CodecInfoURL"] = 3883072] = "CodecInfoURL";
    EbmlTagId[EbmlTagId["CodecSettings"] = 3839639] = "CodecSettings";
    EbmlTagId[EbmlTagId["CodecPrivate"] = 25506] = "CodecPrivate";
    EbmlTagId[EbmlTagId["Language"] = 2274716] = "Language";
    EbmlTagId[EbmlTagId["Name"] = 21358] = "Name";
    EbmlTagId[EbmlTagId["MaxBlockAdditionID"] = 21998] = "MaxBlockAdditionID";
    EbmlTagId[EbmlTagId["TrackOffset"] = 21375] = "TrackOffset";
    EbmlTagId[EbmlTagId["TrackTimecodeScale"] = 2306383] = "TrackTimecodeScale";
    EbmlTagId[EbmlTagId["DefaultDecodedFieldDuration"] = 2313850] = "DefaultDecodedFieldDuration";
    EbmlTagId[EbmlTagId["DefaultDuration"] = 2352003] = "DefaultDuration";
    EbmlTagId[EbmlTagId["MaxCache"] = 28152] = "MaxCache";
    EbmlTagId[EbmlTagId["MinCache"] = 28135] = "MinCache";
    EbmlTagId[EbmlTagId["FlagLacing"] = 156] = "FlagLacing";
    EbmlTagId[EbmlTagId["FlagForced"] = 21930] = "FlagForced";
    EbmlTagId[EbmlTagId["FlagEnabled"] = 185] = "FlagEnabled";
    EbmlTagId[EbmlTagId["TrackUID"] = 29637] = "TrackUID";
    EbmlTagId[EbmlTagId["TrackNumber"] = 215] = "TrackNumber";
    EbmlTagId[EbmlTagId["TrackEntry"] = 174] = "TrackEntry";
    EbmlTagId[EbmlTagId["Tracks"] = 374648427] = "Tracks";
    EbmlTagId[EbmlTagId["EncryptedBlock"] = 175] = "EncryptedBlock";
    EbmlTagId[EbmlTagId["ReferenceTimeCode"] = 202] = "ReferenceTimeCode";
    EbmlTagId[EbmlTagId["ReferenceOffset"] = 201] = "ReferenceOffset";
    EbmlTagId[EbmlTagId["ReferenceFrame"] = 200] = "ReferenceFrame";
    EbmlTagId[EbmlTagId["SliceDuration"] = 207] = "SliceDuration";
    EbmlTagId[EbmlTagId["Delay"] = 206] = "Delay";
    EbmlTagId[EbmlTagId["BlockAdditionID"] = 203] = "BlockAdditionID";
    EbmlTagId[EbmlTagId["FrameNumber"] = 205] = "FrameNumber";
    EbmlTagId[EbmlTagId["LaceNumber"] = 204] = "LaceNumber";
    EbmlTagId[EbmlTagId["TimeSlice"] = 232] = "TimeSlice";
    EbmlTagId[EbmlTagId["Slices"] = 142] = "Slices";
    EbmlTagId[EbmlTagId["DiscardPadding"] = 30114] = "DiscardPadding";
    EbmlTagId[EbmlTagId["CodecState"] = 164] = "CodecState";
    EbmlTagId[EbmlTagId["ReferenceVirtual"] = 253] = "ReferenceVirtual";
    EbmlTagId[EbmlTagId["ReferenceBlock"] = 251] = "ReferenceBlock";
    EbmlTagId[EbmlTagId["ReferencePriority"] = 250] = "ReferencePriority";
    EbmlTagId[EbmlTagId["BlockDuration"] = 155] = "BlockDuration";
    EbmlTagId[EbmlTagId["BlockAdditional"] = 165] = "BlockAdditional";
    EbmlTagId[EbmlTagId["BlockAddID"] = 238] = "BlockAddID";
    EbmlTagId[EbmlTagId["BlockMore"] = 166] = "BlockMore";
    EbmlTagId[EbmlTagId["BlockAdditions"] = 30113] = "BlockAdditions";
    EbmlTagId[EbmlTagId["BlockVirtual"] = 162] = "BlockVirtual";
    EbmlTagId[EbmlTagId["Block"] = 161] = "Block";
    EbmlTagId[EbmlTagId["BlockGroup"] = 160] = "BlockGroup";
    EbmlTagId[EbmlTagId["SimpleBlock"] = 163] = "SimpleBlock";
    EbmlTagId[EbmlTagId["PrevSize"] = 171] = "PrevSize";
    EbmlTagId[EbmlTagId["Position"] = 167] = "Position";
    EbmlTagId[EbmlTagId["SilentTrackNumber"] = 22743] = "SilentTrackNumber";
    EbmlTagId[EbmlTagId["Timecode"] = 231] = "Timecode";
    EbmlTagId[EbmlTagId["Cluster"] = 524531317] = "Cluster";
    EbmlTagId[EbmlTagId["MuxingApp"] = 19840] = "MuxingApp";
    EbmlTagId[EbmlTagId["Title"] = 31657] = "Title";
    EbmlTagId[EbmlTagId["TimecodeScaleDenominator"] = 2807730] = "TimecodeScaleDenominator";
    EbmlTagId[EbmlTagId["TimecodeScale"] = 2807729] = "TimecodeScale";
    EbmlTagId[EbmlTagId["ChapterTranslateID"] = 27045] = "ChapterTranslateID";
    EbmlTagId[EbmlTagId["ChapterTranslateCodec"] = 27071] = "ChapterTranslateCodec";
    EbmlTagId[EbmlTagId["ChapterTranslateEditionUID"] = 27132] = "ChapterTranslateEditionUID";
    EbmlTagId[EbmlTagId["NextFilename"] = 4096955] = "NextFilename";
    EbmlTagId[EbmlTagId["NextUID"] = 4110627] = "NextUID";
    EbmlTagId[EbmlTagId["PrevFilename"] = 3965867] = "PrevFilename";
    EbmlTagId[EbmlTagId["PrevUID"] = 3979555] = "PrevUID";
    EbmlTagId[EbmlTagId["SegmentUID"] = 29604] = "SegmentUID";
    EbmlTagId[EbmlTagId["Info"] = 357149030] = "Info";
    EbmlTagId[EbmlTagId["SeekPosition"] = 21420] = "SeekPosition";
    EbmlTagId[EbmlTagId["SeekID"] = 21419] = "SeekID";
    EbmlTagId[EbmlTagId["Seek"] = 19899] = "Seek";
    EbmlTagId[EbmlTagId["SeekHead"] = 290298740] = "SeekHead";
    EbmlTagId[EbmlTagId["SignatureElementList"] = 32379] = "SignatureElementList";
    EbmlTagId[EbmlTagId["SignatureElements"] = 32347] = "SignatureElements";
    EbmlTagId[EbmlTagId["Signature"] = 32437] = "Signature";
    EbmlTagId[EbmlTagId["SignaturePublicKey"] = 32421] = "SignaturePublicKey";
    EbmlTagId[EbmlTagId["SignatureHash"] = 32410] = "SignatureHash";
    EbmlTagId[EbmlTagId["SignatureAlgo"] = 32394] = "SignatureAlgo";
    EbmlTagId[EbmlTagId["SignatureSlot"] = 458458727] = "SignatureSlot";
    EbmlTagId[EbmlTagId["CRC32"] = 191] = "CRC32";
    EbmlTagId[EbmlTagId["Void"] = 236] = "Void";
    EbmlTagId[EbmlTagId["EBMLMaxSizeLength"] = 17139] = "EBMLMaxSizeLength";
    EbmlTagId[EbmlTagId["EBMLMaxIDLength"] = 17138] = "EBMLMaxIDLength";
    EbmlTagId[EbmlTagId["EBMLReadVersion"] = 17143] = "EBMLReadVersion";
    EbmlTagId[EbmlTagId["EBML"] = 440786851] = "EBML";
})(exports.EbmlTagId || (exports.EbmlTagId = {}));
});

class EbmlTag {
    constructor(id, type, position) {
        this.id = id;
        this.type = type;
        this.position = position;
    }
    getTagDeclaration() {
        let tagHex = this.id.toString(16);
        if (tagHex.length % 2 !== 0) {
            tagHex = `0${tagHex}`;
        }
        return Buffer$4.from(tagHex, 'hex');
    }
    encode() {
        let vintSize = null;
        let content = this.encodeContent();
        if (this.size === -1) {
            vintSize = Buffer$4.from('01ffffffffffffff', 'hex');
        }
        else {
            let specialLength = undefined;
            if ([
                EbmlTagId_1.EbmlTagId.Segment,
                EbmlTagId_1.EbmlTagId.Cluster
            ].some(i => i === this.id)) {
                specialLength = 8;
            }
            vintSize = tools.Tools.writeVint(content.length, specialLength);
        }
        return Buffer$4.concat([
            this.getTagDeclaration(),
            vintSize,
            content
        ]);
    }
}
var EbmlTag_2 = EbmlTag;

var EbmlTag_1 = /*#__PURE__*/Object.defineProperty({
	EbmlTag: EbmlTag_2
}, '__esModule', {value: true});

var EbmlTagFactory_1$1 = EbmlTagFactory_1;

class EbmlMasterTag extends EbmlTag_1.EbmlTag {
    constructor(id, position = EbmlTagPosition_1.EbmlTagPosition.Content) {
        super(id, EbmlElementType_1.EbmlElementType.Master, position);
        this._children = [];
    }
    get Children() {
        return this._children;
    }
    set Children(value) {
        this._children = value;
    }
    encodeContent() {
        return Buffer$4.concat(this._children.map(child => child.encode()));
    }
    parseContent(content) {
        while (content.length > 0) {
            const tag = tools.Tools.readVint(content);
            const size = tools.Tools.readVint(content, tag.length);
            const tagIdHex = tools.Tools.readHexString(content, 0, tag.length);
            const tagId = Number.parseInt(tagIdHex, 16);
            let tagObject = EbmlTagFactory_1$1.EbmlTagFactory.create(tagId);
            tagObject.size = size.value;
            let totalTagLength = tag.length + size.length + size.value;
            tagObject.parseContent(content.slice(tag.length + size.length, totalTagLength));
            this._children.push(tagObject);
            content = content.slice(totalTagLength);
        }
    }
}
var EbmlMasterTag_2 = EbmlMasterTag;

var EbmlMasterTag_1 = /*#__PURE__*/Object.defineProperty({
	EbmlMasterTag: EbmlMasterTag_2
}, '__esModule', {value: true});

class EbmlDataTag extends EbmlTag_1.EbmlTag {
    constructor(id, type) {
        super(id, type, EbmlTagPosition_1.EbmlTagPosition.Content);
    }
    parseContent(data) {
        switch (this.type) {
            case EbmlElementType_1.EbmlElementType.UnsignedInt:
                this.data = tools.Tools.readUnsigned(data);
                break;
            case EbmlElementType_1.EbmlElementType.Float:
                this.data = tools.Tools.readFloat(data);
                break;
            case EbmlElementType_1.EbmlElementType.Integer:
                this.data = tools.Tools.readSigned(data);
                break;
            case EbmlElementType_1.EbmlElementType.String:
                this.data = String.fromCharCode(...data);
                break;
            case EbmlElementType_1.EbmlElementType.UTF8:
                this.data = tools.Tools.readUtf8(data);
                break;
            default:
                this.data = data;
                break;
        }
    }
    encodeContent() {
        switch (this.type) {
            case EbmlElementType_1.EbmlElementType.UnsignedInt:
                return tools.Tools.writeUnsigned(this.data);
            case EbmlElementType_1.EbmlElementType.Float:
                return tools.Tools.writeFloat(this.data);
            case EbmlElementType_1.EbmlElementType.Integer:
                return tools.Tools.writeSigned(this.data);
            case EbmlElementType_1.EbmlElementType.String:
                return Buffer$4.from(this.data, "ascii");
            case EbmlElementType_1.EbmlElementType.UTF8:
                return Buffer$4.from(this.data, "utf8");
            case EbmlElementType_1.EbmlElementType.Binary:
            default:
                return this.data;
        }
    }
}
var EbmlDataTag_2 = EbmlDataTag;

var EbmlDataTag_1 = /*#__PURE__*/Object.defineProperty({
	EbmlDataTag: EbmlDataTag_2
}, '__esModule', {value: true});

var BlockLacing_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });
(function (BlockLacing) {
    BlockLacing[BlockLacing["None"] = 0] = "None";
    BlockLacing[BlockLacing["Xiph"] = 1] = "Xiph";
    BlockLacing[BlockLacing["EBML"] = 2] = "EBML";
    BlockLacing[BlockLacing["FixedSize"] = 3] = "FixedSize";
})(exports.BlockLacing || (exports.BlockLacing = {}));
});

class Block extends EbmlDataTag_1.EbmlDataTag {
    constructor(subTypeId) {
        super(subTypeId || EbmlTagId_1.EbmlTagId.Block, EbmlElementType_1.EbmlElementType.Binary);
    }
    writeTrackBuffer() {
        return tools.Tools.writeVint(this.track);
    }
    writeValueBuffer() {
        let value = Buffer$4.alloc(2);
        value.writeInt16BE(this.value, 0);
        return value;
    }
    writeFlagsBuffer() {
        let flags = 0x00;
        if (this.invisible) {
            flags |= 0x10;
        }
        switch (this.lacing) {
            case BlockLacing_1.BlockLacing.None:
                break;
            case BlockLacing_1.BlockLacing.Xiph:
                flags |= 0x04;
                break;
            case BlockLacing_1.BlockLacing.EBML:
                flags |= 0x08;
                break;
            case BlockLacing_1.BlockLacing.FixedSize:
                flags |= 0x0c;
                break;
        }
        return Buffer$4.of(flags);
    }
    encodeContent() {
        return Buffer$4.concat([
            this.writeTrackBuffer(),
            this.writeValueBuffer(),
            this.writeFlagsBuffer(),
            this.payload
        ]);
    }
    parseContent(data) {
        const track = tools.Tools.readVint(data);
        this.track = track.value;
        this.value = tools.Tools.readSigned(data.subarray(track.length, track.length + 2));
        let flags = data[track.length + 2];
        this.invisible = Boolean(flags & 0x10);
        switch (flags & 0x0c) {
            case 0x00:
                this.lacing = BlockLacing_1.BlockLacing.None;
                break;
            case 0x04:
                this.lacing = BlockLacing_1.BlockLacing.Xiph;
                break;
            case 0x08:
                this.lacing = BlockLacing_1.BlockLacing.EBML;
                break;
            case 0x0c:
                this.lacing = BlockLacing_1.BlockLacing.FixedSize;
                break;
        }
        this.payload = data.slice(track.length + 3);
    }
}
var Block_2 = Block;

var Block_1 = /*#__PURE__*/Object.defineProperty({
	Block: Block_2
}, '__esModule', {value: true});

class SimpleBlock extends Block_1.Block {
    constructor() {
        super(EbmlTagId_1.EbmlTagId.SimpleBlock);
    }
    encodeContent() {
        let flags = this.writeFlagsBuffer();
        if (this.keyframe) {
            flags[0] |= 0x80;
        }
        if (this.discardable) {
            flags[0] |= 0x01;
        }
        return Buffer$4.concat([
            this.writeTrackBuffer(),
            this.writeValueBuffer(),
            flags,
            this.payload
        ]);
    }
    parseContent(data) {
        super.parseContent(data);
        const track = tools.Tools.readVint(data);
        let flags = data[track.length + 2];
        this.keyframe = Boolean(flags & 0x80);
        this.discardable = Boolean(flags & 0x01);
    }
}
var SimpleBlock_2 = SimpleBlock;

var SimpleBlock_1 = /*#__PURE__*/Object.defineProperty({
	SimpleBlock: SimpleBlock_2
}, '__esModule', {value: true});

class EbmlTagFactory {
    static create(id, type) {
        if (EbmlTagId_1.EbmlTagId[id] !== undefined) {
            let foundType;
            switch (id) {
                case EbmlTagId_1.EbmlTagId.Block:
                    return new Block_1.Block();
                case EbmlTagId_1.EbmlTagId.SimpleBlock:
                    return new SimpleBlock_1.SimpleBlock();
                case EbmlTagId_1.EbmlTagId.ChapterDisplay:
                case EbmlTagId_1.EbmlTagId.ContentCompression:
                case EbmlTagId_1.EbmlTagId.ContentEncryption:
                case EbmlTagId_1.EbmlTagId.SilentTracks:
                case EbmlTagId_1.EbmlTagId.ContentEncoding:
                case EbmlTagId_1.EbmlTagId.TrackTranslate:
                case EbmlTagId_1.EbmlTagId.ChapProcessCommand:
                case EbmlTagId_1.EbmlTagId.ChapterTranslate:
                case EbmlTagId_1.EbmlTagId.ChapProcess:
                case EbmlTagId_1.EbmlTagId.Tag:
                case EbmlTagId_1.EbmlTagId.Segment:
                case EbmlTagId_1.EbmlTagId.SimpleTag:
                case EbmlTagId_1.EbmlTagId.Targets:
                case EbmlTagId_1.EbmlTagId.Tags:
                case EbmlTagId_1.EbmlTagId.ChapterTrack:
                case EbmlTagId_1.EbmlTagId.ChapterAtom:
                case EbmlTagId_1.EbmlTagId.EditionEntry:
                case EbmlTagId_1.EbmlTagId.Chapters:
                case EbmlTagId_1.EbmlTagId.AttachedFile:
                case EbmlTagId_1.EbmlTagId.Attachments:
                case EbmlTagId_1.EbmlTagId.CueReference:
                case EbmlTagId_1.EbmlTagId.CueTrackPositions:
                case EbmlTagId_1.EbmlTagId.CuePoint:
                case EbmlTagId_1.EbmlTagId.Cues:
                case EbmlTagId_1.EbmlTagId.ContentEncAESSettings:
                case EbmlTagId_1.EbmlTagId.ContentEncodings:
                case EbmlTagId_1.EbmlTagId.TrackJoinBlocks:
                case EbmlTagId_1.EbmlTagId.TrackPlane:
                case EbmlTagId_1.EbmlTagId.TrackCombinePlanes:
                case EbmlTagId_1.EbmlTagId.TrackOperation:
                case EbmlTagId_1.EbmlTagId.Audio:
                case EbmlTagId_1.EbmlTagId.Video:
                case EbmlTagId_1.EbmlTagId.TrackEntry:
                case EbmlTagId_1.EbmlTagId.Tracks:
                case EbmlTagId_1.EbmlTagId.ReferenceFrame:
                case EbmlTagId_1.EbmlTagId.TimeSlice:
                case EbmlTagId_1.EbmlTagId.Slices:
                case EbmlTagId_1.EbmlTagId.BlockMore:
                case EbmlTagId_1.EbmlTagId.BlockAdditions:
                case EbmlTagId_1.EbmlTagId.BlockGroup:
                case EbmlTagId_1.EbmlTagId.Cluster:
                case EbmlTagId_1.EbmlTagId.Info:
                case EbmlTagId_1.EbmlTagId.Seek:
                case EbmlTagId_1.EbmlTagId.SeekHead:
                case EbmlTagId_1.EbmlTagId.SignatureElementList:
                case EbmlTagId_1.EbmlTagId.SignatureElements:
                case EbmlTagId_1.EbmlTagId.SignatureSlot:
                case EbmlTagId_1.EbmlTagId.EBML:
                    foundType = EbmlElementType_1.EbmlElementType.Master;
                    break;
                case EbmlTagId_1.EbmlTagId.TrackType:
                case EbmlTagId_1.EbmlTagId.FlagDefault:
                case EbmlTagId_1.EbmlTagId.ChapterTrackNumber:
                case EbmlTagId_1.EbmlTagId.ChapterTimeStart:
                case EbmlTagId_1.EbmlTagId.ChapterTimeEnd:
                case EbmlTagId_1.EbmlTagId.CueRefTime:
                case EbmlTagId_1.EbmlTagId.CueRefCluster:
                case EbmlTagId_1.EbmlTagId.ChapterFlagHidden:
                case EbmlTagId_1.EbmlTagId.ContentCompAlgo:
                case EbmlTagId_1.EbmlTagId.DocTypeReadVersion:
                case EbmlTagId_1.EbmlTagId.EBMLVersion:
                case EbmlTagId_1.EbmlTagId.DocTypeVersion:
                case EbmlTagId_1.EbmlTagId.TagDefault:
                case EbmlTagId_1.EbmlTagId.ChapterFlagEnabled:
                case EbmlTagId_1.EbmlTagId.FileUsedStartTime:
                case EbmlTagId_1.EbmlTagId.FileUsedEndTime:
                case EbmlTagId_1.EbmlTagId.ContentEncodingOrder:
                case EbmlTagId_1.EbmlTagId.ContentEncodingScope:
                case EbmlTagId_1.EbmlTagId.ContentEncodingType:
                case EbmlTagId_1.EbmlTagId.CueBlockNumber:
                case EbmlTagId_1.EbmlTagId.BitDepth:
                case EbmlTagId_1.EbmlTagId.ChapProcessTime:
                case EbmlTagId_1.EbmlTagId.ChapProcessCodecID:
                case EbmlTagId_1.EbmlTagId.AttachmentLink:
                case EbmlTagId_1.EbmlTagId.TagAttachmentUID:
                case EbmlTagId_1.EbmlTagId.TagChapterUID:
                case EbmlTagId_1.EbmlTagId.TagEditionUID:
                case EbmlTagId_1.EbmlTagId.TagTrackUID:
                case EbmlTagId_1.EbmlTagId.TargetTypeValue:
                case EbmlTagId_1.EbmlTagId.ChapterPhysicalEquiv:
                case EbmlTagId_1.EbmlTagId.ChapterSegmentEditionUID:
                case EbmlTagId_1.EbmlTagId.ChapterUID:
                case EbmlTagId_1.EbmlTagId.EditionFlagOrdered:
                case EbmlTagId_1.EbmlTagId.EditionFlagDefault:
                case EbmlTagId_1.EbmlTagId.EditionFlagHidden:
                case EbmlTagId_1.EbmlTagId.EditionUID:
                case EbmlTagId_1.EbmlTagId.FileUID:
                case EbmlTagId_1.EbmlTagId.CueRefCodecState:
                case EbmlTagId_1.EbmlTagId.CueRefNumber:
                case EbmlTagId_1.EbmlTagId.CueCodecState:
                case EbmlTagId_1.EbmlTagId.CueDuration:
                case EbmlTagId_1.EbmlTagId.CueRelativePosition:
                case EbmlTagId_1.EbmlTagId.CueClusterPosition:
                case EbmlTagId_1.EbmlTagId.CueTrack:
                case EbmlTagId_1.EbmlTagId.CueTime:
                case EbmlTagId_1.EbmlTagId.AESSettingsCipherMode:
                case EbmlTagId_1.EbmlTagId.ContentSigHashAlgo:
                case EbmlTagId_1.EbmlTagId.ContentSigAlgo:
                case EbmlTagId_1.EbmlTagId.ContentEncAlgo:
                case EbmlTagId_1.EbmlTagId.TrickMasterTrackUID:
                case EbmlTagId_1.EbmlTagId.TrickTrackFlag:
                case EbmlTagId_1.EbmlTagId.TrickTrackUID:
                case EbmlTagId_1.EbmlTagId.TrackJoinUID:
                case EbmlTagId_1.EbmlTagId.TrackPlaneType:
                case EbmlTagId_1.EbmlTagId.TrackPlaneUID:
                case EbmlTagId_1.EbmlTagId.Channels:
                case EbmlTagId_1.EbmlTagId.AspectRatioType:
                case EbmlTagId_1.EbmlTagId.DisplayUnit:
                case EbmlTagId_1.EbmlTagId.DisplayHeight:
                case EbmlTagId_1.EbmlTagId.DisplayWidth:
                case EbmlTagId_1.EbmlTagId.PixelCropRight:
                case EbmlTagId_1.EbmlTagId.PixelCropLeft:
                case EbmlTagId_1.EbmlTagId.PixelCropTop:
                case EbmlTagId_1.EbmlTagId.PixelCropBottom:
                case EbmlTagId_1.EbmlTagId.PixelHeight:
                case EbmlTagId_1.EbmlTagId.PixelWidth:
                case EbmlTagId_1.EbmlTagId.OldStereoMode:
                case EbmlTagId_1.EbmlTagId.AlphaMode:
                case EbmlTagId_1.EbmlTagId.StereoMode:
                case EbmlTagId_1.EbmlTagId.FlagInterlaced:
                case EbmlTagId_1.EbmlTagId.TrackTranslateCodec:
                case EbmlTagId_1.EbmlTagId.TrackTranslateEditionUID:
                case EbmlTagId_1.EbmlTagId.SeekPreRoll:
                case EbmlTagId_1.EbmlTagId.CodecDelay:
                case EbmlTagId_1.EbmlTagId.TrackOverlay:
                case EbmlTagId_1.EbmlTagId.CodecDecodeAll:
                case EbmlTagId_1.EbmlTagId.MaxBlockAdditionID:
                case EbmlTagId_1.EbmlTagId.DefaultDecodedFieldDuration:
                case EbmlTagId_1.EbmlTagId.DefaultDuration:
                case EbmlTagId_1.EbmlTagId.MaxCache:
                case EbmlTagId_1.EbmlTagId.MinCache:
                case EbmlTagId_1.EbmlTagId.FlagLacing:
                case EbmlTagId_1.EbmlTagId.FlagForced:
                case EbmlTagId_1.EbmlTagId.FlagEnabled:
                case EbmlTagId_1.EbmlTagId.TrackUID:
                case EbmlTagId_1.EbmlTagId.TrackNumber:
                case EbmlTagId_1.EbmlTagId.ReferenceTimeCode:
                case EbmlTagId_1.EbmlTagId.ReferenceOffset:
                case EbmlTagId_1.EbmlTagId.SliceDuration:
                case EbmlTagId_1.EbmlTagId.Delay:
                case EbmlTagId_1.EbmlTagId.BlockAdditionID:
                case EbmlTagId_1.EbmlTagId.FrameNumber:
                case EbmlTagId_1.EbmlTagId.LaceNumber:
                case EbmlTagId_1.EbmlTagId.ReferencePriority:
                case EbmlTagId_1.EbmlTagId.BlockDuration:
                case EbmlTagId_1.EbmlTagId.BlockAddID:
                case EbmlTagId_1.EbmlTagId.PrevSize:
                case EbmlTagId_1.EbmlTagId.Position:
                case EbmlTagId_1.EbmlTagId.SilentTrackNumber:
                case EbmlTagId_1.EbmlTagId.Timecode:
                case EbmlTagId_1.EbmlTagId.TimecodeScaleDenominator:
                case EbmlTagId_1.EbmlTagId.TimecodeScale:
                case EbmlTagId_1.EbmlTagId.ChapterTranslateCodec:
                case EbmlTagId_1.EbmlTagId.ChapterTranslateEditionUID:
                case EbmlTagId_1.EbmlTagId.SeekPosition:
                case EbmlTagId_1.EbmlTagId.SignatureHash:
                case EbmlTagId_1.EbmlTagId.SignatureAlgo:
                case EbmlTagId_1.EbmlTagId.EBMLMaxSizeLength:
                case EbmlTagId_1.EbmlTagId.EBMLMaxIDLength:
                case EbmlTagId_1.EbmlTagId.EBMLReadVersion:
                    foundType = EbmlElementType_1.EbmlElementType.UnsignedInt;
                    break;
                case EbmlTagId_1.EbmlTagId.TrackOffset:
                case EbmlTagId_1.EbmlTagId.DiscardPadding:
                case EbmlTagId_1.EbmlTagId.ReferenceVirtual:
                case EbmlTagId_1.EbmlTagId.ReferenceBlock:
                    foundType = EbmlElementType_1.EbmlElementType.Integer;
                    break;
                case EbmlTagId_1.EbmlTagId.CodecID:
                case EbmlTagId_1.EbmlTagId.DocType:
                case EbmlTagId_1.EbmlTagId.FileMimeType:
                case EbmlTagId_1.EbmlTagId.TagLanguage:
                case EbmlTagId_1.EbmlTagId.TargetType:
                case EbmlTagId_1.EbmlTagId.ChapCountry:
                case EbmlTagId_1.EbmlTagId.ChapLanguage:
                case EbmlTagId_1.EbmlTagId.CodecDownloadURL:
                case EbmlTagId_1.EbmlTagId.CodecInfoURL:
                case EbmlTagId_1.EbmlTagId.Language:
                    foundType = EbmlElementType_1.EbmlElementType.String;
                    break;
                case EbmlTagId_1.EbmlTagId.ChapString:
                case EbmlTagId_1.EbmlTagId.TagString:
                case EbmlTagId_1.EbmlTagId.ChapterStringUID:
                case EbmlTagId_1.EbmlTagId.WritingApp:
                case EbmlTagId_1.EbmlTagId.SegmentFilename:
                case EbmlTagId_1.EbmlTagId.CodecName:
                case EbmlTagId_1.EbmlTagId.TagName:
                case EbmlTagId_1.EbmlTagId.FileName:
                case EbmlTagId_1.EbmlTagId.FileDescription:
                case EbmlTagId_1.EbmlTagId.CodecSettings:
                case EbmlTagId_1.EbmlTagId.Name:
                case EbmlTagId_1.EbmlTagId.MuxingApp:
                case EbmlTagId_1.EbmlTagId.Title:
                case EbmlTagId_1.EbmlTagId.NextFilename:
                case EbmlTagId_1.EbmlTagId.PrevFilename:
                    foundType = EbmlElementType_1.EbmlElementType.UTF8;
                    break;
                case EbmlTagId_1.EbmlTagId.ContentCompSettings:
                case EbmlTagId_1.EbmlTagId.SegmentFamily:
                case EbmlTagId_1.EbmlTagId.TagBinary:
                case EbmlTagId_1.EbmlTagId.FileReferral:
                case EbmlTagId_1.EbmlTagId.SignedElement:
                case EbmlTagId_1.EbmlTagId.ChapProcessData:
                case EbmlTagId_1.EbmlTagId.ChapProcessPrivate:
                case EbmlTagId_1.EbmlTagId.ChapterSegmentUID:
                case EbmlTagId_1.EbmlTagId.FileData:
                case EbmlTagId_1.EbmlTagId.ContentSigKeyID:
                case EbmlTagId_1.EbmlTagId.ContentSignature:
                case EbmlTagId_1.EbmlTagId.ContentEncKeyID:
                case EbmlTagId_1.EbmlTagId.TrickMasterTrackSegmentUID:
                case EbmlTagId_1.EbmlTagId.TrickTrackSegmentUID:
                case EbmlTagId_1.EbmlTagId.ChannelPositions:
                case EbmlTagId_1.EbmlTagId.ColourSpace:
                case EbmlTagId_1.EbmlTagId.TrackTranslateTrackID:
                case EbmlTagId_1.EbmlTagId.CodecPrivate:
                case EbmlTagId_1.EbmlTagId.EncryptedBlock:
                case EbmlTagId_1.EbmlTagId.CodecState:
                case EbmlTagId_1.EbmlTagId.BlockAdditional:
                case EbmlTagId_1.EbmlTagId.BlockVirtual:
                case EbmlTagId_1.EbmlTagId.ChapterTranslateID:
                case EbmlTagId_1.EbmlTagId.NextUID:
                case EbmlTagId_1.EbmlTagId.PrevUID:
                case EbmlTagId_1.EbmlTagId.SegmentUID:
                case EbmlTagId_1.EbmlTagId.SeekID:
                case EbmlTagId_1.EbmlTagId.Signature:
                case EbmlTagId_1.EbmlTagId.SignaturePublicKey:
                case EbmlTagId_1.EbmlTagId.CRC32:
                case EbmlTagId_1.EbmlTagId.Void:
                    foundType = EbmlElementType_1.EbmlElementType.Binary;
                    break;
                case EbmlTagId_1.EbmlTagId.Duration:
                case EbmlTagId_1.EbmlTagId.OutputSamplingFrequency:
                case EbmlTagId_1.EbmlTagId.SamplingFrequency:
                case EbmlTagId_1.EbmlTagId.FrameRate:
                case EbmlTagId_1.EbmlTagId.GammaValue:
                case EbmlTagId_1.EbmlTagId.TrackTimecodeScale:
                    foundType = EbmlElementType_1.EbmlElementType.Float;
                    break;
                case EbmlTagId_1.EbmlTagId.DateUTC:
                    foundType = EbmlElementType_1.EbmlElementType.Date;
                    break;
            }
            if (type === undefined) {
                type = foundType;
            }
            else {
                if (type !== foundType) {
                    throw new Error(`Trying to create tag of well-known type "${EbmlTagId_1.EbmlTagId[id]}" using content type "${type}" (which is incorrect).  Either pass the correct type or ignore the type parameter to EbmlTag.create()`);
                }
            }
        }
        switch (type) {
            case EbmlElementType_1.EbmlElementType.Master:
                return new EbmlMasterTag_1.EbmlMasterTag(id);
            case EbmlElementType_1.EbmlElementType.UTF8:
            case EbmlElementType_1.EbmlElementType.Binary:
            case EbmlElementType_1.EbmlElementType.Date:
            case EbmlElementType_1.EbmlElementType.Float:
            case EbmlElementType_1.EbmlElementType.Integer:
            case EbmlElementType_1.EbmlElementType.String:
            case EbmlElementType_1.EbmlElementType.UnsignedInt:
            default:
                return new EbmlDataTag_1.EbmlDataTag(id, type);
        }
    }
}
var EbmlTagFactory_2 = EbmlTagFactory;

var EbmlTagFactory_1 = /*#__PURE__*/Object.defineProperty({
	EbmlTagFactory: EbmlTagFactory_2
}, '__esModule', {value: true});

class EbmlStreamDecoderOptions {
    constructor() {
        this.bufferTagIds = [];
    }
}
var EbmlStreamDecoderOptions_1 = EbmlStreamDecoderOptions;
class EbmlStreamDecoder$1 extends stream_1.Transform {
    constructor(options = {}) {
        super(Object.assign({}, options, { readableObjectMode: true }));
        this._currentBufferOffset = 0;
        this._tagStack = [];
        this._buffer = Buffer$4.alloc(0);
        this._bufferTagIds = [];
        this._bufferTagIds = options.bufferTagIds || [];
    }
    get buffer() {
        return this._buffer;
    }
    _transform(chunk, enc, done) {
        this._buffer = Buffer$4.concat([this._buffer, Buffer$4.from(chunk)]);
        while (this.parseTags())
            ;
        done();
    }
    parseTags() {
        const currentTag = this.readTagHeader(this._buffer);
        if (!currentTag) {
            return false;
        }
        if (currentTag.type === EbmlElementType_1.EbmlElementType.Master && !this._bufferTagIds.some(i => i === currentTag.id)) {
            this._tagStack.push(currentTag);
            this.emitTag(currentTag, EbmlTagPosition_1.EbmlTagPosition.Start);
            this.advanceBuffer(currentTag.tagHeaderLength);
            return true;
        }
        else {
            if (this._buffer.length < currentTag.tagHeaderLength + currentTag.size) {
                return false;
            }
            const data = this._buffer.slice(currentTag.tagHeaderLength, currentTag.tagHeaderLength + currentTag.size);
            this.emitTag(currentTag, EbmlTagPosition_1.EbmlTagPosition.Content, data);
            this.advanceBuffer(currentTag.tagHeaderLength + currentTag.size);
            while (this._tagStack.length > 0) {
                const nextTag = this._tagStack[this._tagStack.length - 1];
                if (this._currentBufferOffset < (nextTag.absoluteStart + nextTag.tagHeaderLength + nextTag.size)) {
                    break;
                }
                this.emitTag(nextTag, EbmlTagPosition_1.EbmlTagPosition.End);
                this._tagStack.pop();
            }
        }
        return true;
    }
    advanceBuffer(length) {
        this._currentBufferOffset += length;
        this._buffer = this._buffer.slice(length);
    }
    readTagHeader(buffer, offset = 0) {
        if (buffer.length == 0) {
            return null;
        }
        const tag = tools.Tools.readVint(buffer, offset);
        if (tag == null) {
            return null;
        }
        const size = tools.Tools.readVint(buffer, offset + tag.length);
        if (size == null) {
            return null;
        }
        const tagIdHex = tools.Tools.readHexString(buffer, offset, offset + tag.length);
        const tagId = Number.parseInt(tagIdHex, 16);
        let tagObject = EbmlTagFactory_1$1.EbmlTagFactory.create(tagId);
        tagObject.size = size.value;
        return Object.assign(tagObject, {
            absoluteStart: this._currentBufferOffset + offset,
            tagHeaderLength: tag.length + size.length
        });
    }
    emitTag(tag, position, data) {
        let emittedTag = EbmlTagFactory_1$1.EbmlTagFactory.create(tag.id);
        emittedTag.size = tag.size;
        emittedTag.position = position;
        if (position === EbmlTagPosition_1.EbmlTagPosition.Content) {
            emittedTag.parseContent(data);
        }
        this.push(emittedTag);
    }
}
var EbmlStreamDecoder_2 = EbmlStreamDecoder$1;

var EbmlStreamDecoder_1 = /*#__PURE__*/Object.defineProperty({
	EbmlStreamDecoderOptions: EbmlStreamDecoderOptions_1,
	EbmlStreamDecoder: EbmlStreamDecoder_2
}, '__esModule', {value: true});

class EbmlStreamEncoder extends stream_1.Transform {
    constructor(options = {}) {
        super(Object.assign({}, options, { writableObjectMode: true }));
        this.dataBuffer = Buffer$4.alloc(0);
        this.mCorked = false;
        this.openTags = [];
    }
    _transform(chunk, enc, done) {
        if (chunk) {
            if (!chunk.id) {
                throw new Error(`No id found for ${JSON.stringify(chunk)}`);
            }
            switch (chunk.position) {
                case EbmlTagPosition_1.EbmlTagPosition.Start:
                    this.startTag(chunk);
                    break;
                case EbmlTagPosition_1.EbmlTagPosition.Content:
                    this.writeTag(chunk);
                    break;
                case EbmlTagPosition_1.EbmlTagPosition.End:
                    this.endTag(chunk);
                    break;
            }
        }
        done();
    }
    bufferAndFlush(buffer) {
        this.dataBuffer = Buffer$4.concat([this.dataBuffer, buffer]);
        this._flush(() => { });
    }
    _flush(callback) {
        let chunk = null;
        if (this.dataBuffer.length > 0 && !this.mCorked) {
            chunk = Buffer$4.from(this.dataBuffer);
            this.dataBuffer = Buffer$4.alloc(0);
            this.push(chunk);
        }
        callback();
    }
    _bufferAndFlush(buffer) {
        this.bufferAndFlush(buffer);
    }
    flush() {
        this._flush(() => { });
    }
    get buffer() {
        return this.dataBuffer;
    }
    set buffer(val) {
        this.dataBuffer = val;
    }
    get stack() {
        return this.openTags;
    }
    cork() {
        this.mCorked = true;
    }
    uncork() {
        this.mCorked = false;
        this._flush(() => { });
    }
    writeTag(tag) {
        if (this.openTags.length > 0) {
            this.openTags[this.openTags.length - 1].Children.push(tag);
        }
        else {
            this.bufferAndFlush(tag.encode());
        }
    }
    startTag(tag) {
        if (this.openTags.length > 0) {
            this.openTags[this.openTags.length - 1].Children.push(tag);
        }
        this.openTags.push(tag);
    }
    endTag(tag) {
        const inMemoryTag = this.openTags.pop();
        if (tag.id !== inMemoryTag.id) {
            throw `Logic error - closing tag "${EbmlTagId_1.EbmlTagId[tag.id]}" is not expected tag "${EbmlTagId_1.EbmlTagId[inMemoryTag.id]}"`;
        }
        if (this.openTags.length < 1) {
            this.bufferAndFlush(inMemoryTag.encode());
        }
    }
}
var EbmlStreamEncoder_2 = EbmlStreamEncoder;

var EbmlStreamEncoder_1 = /*#__PURE__*/Object.defineProperty({
	EbmlStreamEncoder: EbmlStreamEncoder_2
}, '__esModule', {value: true});

tools.Tools;

var EbmlStreamDecoder = EbmlStreamDecoder_1.EbmlStreamDecoder;

EbmlStreamEncoder_1.EbmlStreamEncoder;

Block_1.Block;

BlockLacing_1.BlockLacing;

EbmlDataTag_1.EbmlDataTag;

EbmlElementType_1.EbmlElementType;

EbmlMasterTag_1.EbmlMasterTag;

EbmlTag_1.EbmlTag;

EbmlTagFactory_1$1.EbmlTagFactory;

var EbmlTagId = EbmlTagId_1.EbmlTagId;

EbmlTagPosition_1.EbmlTagPosition;

SimpleBlock_1.SimpleBlock;

// shim for using process in browser
// based off https://github.com/defunctzombie/node-process/blob/master/browser.js

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
var cachedSetTimeout = defaultSetTimout;
var cachedClearTimeout = defaultClearTimeout;
if (typeof global$1.setTimeout === 'function') {
    cachedSetTimeout = setTimeout;
}
if (typeof global$1.clearTimeout === 'function') {
    cachedClearTimeout = clearTimeout;
}

function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}
function nextTick(fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
}
// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
var title = 'browser';
var platform = 'browser';
var browser$1 = true;
var env = {};
var argv = [];
var version = ''; // empty string to avoid regexp issues
var versions = {};
var release = {};
var config$1 = {};

function noop$2() {}

var on = noop$2;
var addListener = noop$2;
var once$2 = noop$2;
var off = noop$2;
var removeListener = noop$2;
var removeAllListeners = noop$2;
var emit = noop$2;

function binding(name) {
    throw new Error('process.binding is not supported');
}

function cwd () { return '/' }
function chdir (dir) {
    throw new Error('process.chdir is not supported');
}function umask() { return 0; }

// from https://github.com/kumavis/browser-process-hrtime/blob/master/index.js
var performance = global$1.performance || {};
var performanceNow =
  performance.now        ||
  performance.mozNow     ||
  performance.msNow      ||
  performance.oNow       ||
  performance.webkitNow  ||
  function(){ return (new Date()).getTime() };

// generate timestamp or delta
// see http://nodejs.org/api/process.html#process_process_hrtime
function hrtime(previousTimestamp){
  var clocktime = performanceNow.call(performance)*1e-3;
  var seconds = Math.floor(clocktime);
  var nanoseconds = Math.floor((clocktime%1)*1e9);
  if (previousTimestamp) {
    seconds = seconds - previousTimestamp[0];
    nanoseconds = nanoseconds - previousTimestamp[1];
    if (nanoseconds<0) {
      seconds--;
      nanoseconds += 1e9;
    }
  }
  return [seconds,nanoseconds]
}

var startTime = new Date();
function uptime() {
  var currentTime = new Date();
  var dif = currentTime - startTime;
  return dif / 1000;
}

var browser$1$1 = {
  nextTick: nextTick,
  title: title,
  browser: browser$1,
  env: env,
  argv: argv,
  version: version,
  versions: versions,
  on: on,
  addListener: addListener,
  once: once$2,
  off: off,
  removeListener: removeListener,
  removeAllListeners: removeAllListeners,
  emit: emit,
  binding: binding,
  cwd: cwd,
  chdir: chdir,
  umask: umask,
  hrtime: hrtime,
  platform: platform,
  release: release,
  config: config$1,
  uptime: uptime
};

var process = browser$1$1;

var streamBrowser = require$$0$1.EventEmitter;

var _nodeResolve_empty = {};

var _nodeResolve_empty$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    'default': _nodeResolve_empty
});

var debugUtil = /*@__PURE__*/getAugmentedNamespace(_nodeResolve_empty$1);

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty$1(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty$1(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var Buffer$3 = buffer.Buffer;

var inspect = debugUtil.inspect;

var custom = inspect && inspect.custom || 'inspect';

function copyBuffer(src, target, offset) {
  Buffer$3.prototype.copy.call(src, target, offset);
}

var buffer_list =
/*#__PURE__*/
function () {
  function BufferList() {
    _classCallCheck(this, BufferList);

    this.head = null;
    this.tail = null;
    this.length = 0;
  }

  _createClass(BufferList, [{
    key: "push",
    value: function push(v) {
      var entry = {
        data: v,
        next: null
      };
      if (this.length > 0) this.tail.next = entry;else this.head = entry;
      this.tail = entry;
      ++this.length;
    }
  }, {
    key: "unshift",
    value: function unshift(v) {
      var entry = {
        data: v,
        next: this.head
      };
      if (this.length === 0) this.tail = entry;
      this.head = entry;
      ++this.length;
    }
  }, {
    key: "shift",
    value: function shift() {
      if (this.length === 0) return;
      var ret = this.head.data;
      if (this.length === 1) this.head = this.tail = null;else this.head = this.head.next;
      --this.length;
      return ret;
    }
  }, {
    key: "clear",
    value: function clear() {
      this.head = this.tail = null;
      this.length = 0;
    }
  }, {
    key: "join",
    value: function join(s) {
      if (this.length === 0) return '';
      var p = this.head;
      var ret = '' + p.data;

      while (p = p.next) {
        ret += s + p.data;
      }

      return ret;
    }
  }, {
    key: "concat",
    value: function concat(n) {
      if (this.length === 0) return Buffer$3.alloc(0);
      var ret = Buffer$3.allocUnsafe(n >>> 0);
      var p = this.head;
      var i = 0;

      while (p) {
        copyBuffer(p.data, ret, i);
        i += p.data.length;
        p = p.next;
      }

      return ret;
    } // Consumes a specified amount of bytes or characters from the buffered data.

  }, {
    key: "consume",
    value: function consume(n, hasStrings) {
      var ret;

      if (n < this.head.data.length) {
        // `slice` is the same for buffers and strings.
        ret = this.head.data.slice(0, n);
        this.head.data = this.head.data.slice(n);
      } else if (n === this.head.data.length) {
        // First chunk is a perfect match.
        ret = this.shift();
      } else {
        // Result spans more than one buffer.
        ret = hasStrings ? this._getString(n) : this._getBuffer(n);
      }

      return ret;
    }
  }, {
    key: "first",
    value: function first() {
      return this.head.data;
    } // Consumes a specified amount of characters from the buffered data.

  }, {
    key: "_getString",
    value: function _getString(n) {
      var p = this.head;
      var c = 1;
      var ret = p.data;
      n -= ret.length;

      while (p = p.next) {
        var str = p.data;
        var nb = n > str.length ? str.length : n;
        if (nb === str.length) ret += str;else ret += str.slice(0, n);
        n -= nb;

        if (n === 0) {
          if (nb === str.length) {
            ++c;
            if (p.next) this.head = p.next;else this.head = this.tail = null;
          } else {
            this.head = p;
            p.data = str.slice(nb);
          }

          break;
        }

        ++c;
      }

      this.length -= c;
      return ret;
    } // Consumes a specified amount of bytes from the buffered data.

  }, {
    key: "_getBuffer",
    value: function _getBuffer(n) {
      var ret = Buffer$3.allocUnsafe(n);
      var p = this.head;
      var c = 1;
      p.data.copy(ret);
      n -= p.data.length;

      while (p = p.next) {
        var buf = p.data;
        var nb = n > buf.length ? buf.length : n;
        buf.copy(ret, ret.length - n, 0, nb);
        n -= nb;

        if (n === 0) {
          if (nb === buf.length) {
            ++c;
            if (p.next) this.head = p.next;else this.head = this.tail = null;
          } else {
            this.head = p;
            p.data = buf.slice(nb);
          }

          break;
        }

        ++c;
      }

      this.length -= c;
      return ret;
    } // Make sure the linked list only shows the minimal necessary information.

  }, {
    key: custom,
    value: function value(_, options) {
      return inspect(this, _objectSpread({}, options, {
        // Only inspect one level.
        depth: 0,
        // It should not recurse.
        customInspect: false
      }));
    }
  }]);

  return BufferList;
}();

function destroy(err, cb) {
  var _this = this;

  var readableDestroyed = this._readableState && this._readableState.destroyed;
  var writableDestroyed = this._writableState && this._writableState.destroyed;

  if (readableDestroyed || writableDestroyed) {
    if (cb) {
      cb(err);
    } else if (err) {
      if (!this._writableState) {
        process.nextTick(emitErrorNT, this, err);
      } else if (!this._writableState.errorEmitted) {
        this._writableState.errorEmitted = true;
        process.nextTick(emitErrorNT, this, err);
      }
    }

    return this;
  } // we set destroyed to true before firing error callbacks in order
  // to make it re-entrance safe in case destroy() is called within callbacks


  if (this._readableState) {
    this._readableState.destroyed = true;
  } // if this is a duplex stream mark the writable part as destroyed as well


  if (this._writableState) {
    this._writableState.destroyed = true;
  }

  this._destroy(err || null, function (err) {
    if (!cb && err) {
      if (!_this._writableState) {
        process.nextTick(emitErrorAndCloseNT, _this, err);
      } else if (!_this._writableState.errorEmitted) {
        _this._writableState.errorEmitted = true;
        process.nextTick(emitErrorAndCloseNT, _this, err);
      } else {
        process.nextTick(emitCloseNT, _this);
      }
    } else if (cb) {
      process.nextTick(emitCloseNT, _this);
      cb(err);
    } else {
      process.nextTick(emitCloseNT, _this);
    }
  });

  return this;
}

function emitErrorAndCloseNT(self, err) {
  emitErrorNT(self, err);
  emitCloseNT(self);
}

function emitCloseNT(self) {
  if (self._writableState && !self._writableState.emitClose) return;
  if (self._readableState && !self._readableState.emitClose) return;
  self.emit('close');
}

function undestroy() {
  if (this._readableState) {
    this._readableState.destroyed = false;
    this._readableState.reading = false;
    this._readableState.ended = false;
    this._readableState.endEmitted = false;
  }

  if (this._writableState) {
    this._writableState.destroyed = false;
    this._writableState.ended = false;
    this._writableState.ending = false;
    this._writableState.finalCalled = false;
    this._writableState.prefinished = false;
    this._writableState.finished = false;
    this._writableState.errorEmitted = false;
  }
}

function emitErrorNT(self, err) {
  self.emit('error', err);
}

function errorOrDestroy$2(stream, err) {
  // We have tests that rely on errors being emitted
  // in the same tick, so changing this is semver major.
  // For now when you opt-in to autoDestroy we allow
  // the error to be emitted nextTick. In a future
  // semver major update we should change the default to this.
  var rState = stream._readableState;
  var wState = stream._writableState;
  if (rState && rState.autoDestroy || wState && wState.autoDestroy) stream.destroy(err);else stream.emit('error', err);
}

var destroy_1 = {
  destroy: destroy,
  undestroy: undestroy,
  errorOrDestroy: errorOrDestroy$2
};

function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; subClass.__proto__ = superClass; }

var codes = {};

function createErrorType(code, message, Base) {
  if (!Base) {
    Base = Error;
  }

  function getMessage(arg1, arg2, arg3) {
    if (typeof message === 'string') {
      return message;
    } else {
      return message(arg1, arg2, arg3);
    }
  }

  var NodeError =
  /*#__PURE__*/
  function (_Base) {
    _inheritsLoose(NodeError, _Base);

    function NodeError(arg1, arg2, arg3) {
      return _Base.call(this, getMessage(arg1, arg2, arg3)) || this;
    }

    return NodeError;
  }(Base);

  NodeError.prototype.name = Base.name;
  NodeError.prototype.code = code;
  codes[code] = NodeError;
} // https://github.com/nodejs/node/blob/v10.8.0/lib/internal/errors.js


function oneOf(expected, thing) {
  if (Array.isArray(expected)) {
    var len = expected.length;
    expected = expected.map(function (i) {
      return String(i);
    });

    if (len > 2) {
      return "one of ".concat(thing, " ").concat(expected.slice(0, len - 1).join(', '), ", or ") + expected[len - 1];
    } else if (len === 2) {
      return "one of ".concat(thing, " ").concat(expected[0], " or ").concat(expected[1]);
    } else {
      return "of ".concat(thing, " ").concat(expected[0]);
    }
  } else {
    return "of ".concat(thing, " ").concat(String(expected));
  }
} // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/startsWith


function startsWith(str, search, pos) {
  return str.substr(!pos || pos < 0 ? 0 : +pos, search.length) === search;
} // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/endsWith


function endsWith(str, search, this_len) {
  if (this_len === undefined || this_len > str.length) {
    this_len = str.length;
  }

  return str.substring(this_len - search.length, this_len) === search;
} // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/includes


function includes(str, search, start) {
  if (typeof start !== 'number') {
    start = 0;
  }

  if (start + search.length > str.length) {
    return false;
  } else {
    return str.indexOf(search, start) !== -1;
  }
}

createErrorType('ERR_INVALID_OPT_VALUE', function (name, value) {
  return 'The value "' + value + '" is invalid for option "' + name + '"';
}, TypeError);
createErrorType('ERR_INVALID_ARG_TYPE', function (name, expected, actual) {
  // determiner: 'must be' or 'must not be'
  var determiner;

  if (typeof expected === 'string' && startsWith(expected, 'not ')) {
    determiner = 'must not be';
    expected = expected.replace(/^not /, '');
  } else {
    determiner = 'must be';
  }

  var msg;

  if (endsWith(name, ' argument')) {
    // For cases like 'first argument'
    msg = "The ".concat(name, " ").concat(determiner, " ").concat(oneOf(expected, 'type'));
  } else {
    var type = includes(name, '.') ? 'property' : 'argument';
    msg = "The \"".concat(name, "\" ").concat(type, " ").concat(determiner, " ").concat(oneOf(expected, 'type'));
  }

  msg += ". Received type ".concat(typeof actual);
  return msg;
}, TypeError);
createErrorType('ERR_STREAM_PUSH_AFTER_EOF', 'stream.push() after EOF');
createErrorType('ERR_METHOD_NOT_IMPLEMENTED', function (name) {
  return 'The ' + name + ' method is not implemented';
});
createErrorType('ERR_STREAM_PREMATURE_CLOSE', 'Premature close');
createErrorType('ERR_STREAM_DESTROYED', function (name) {
  return 'Cannot call ' + name + ' after a stream was destroyed';
});
createErrorType('ERR_MULTIPLE_CALLBACK', 'Callback called multiple times');
createErrorType('ERR_STREAM_CANNOT_PIPE', 'Cannot pipe, not readable');
createErrorType('ERR_STREAM_WRITE_AFTER_END', 'write after end');
createErrorType('ERR_STREAM_NULL_VALUES', 'May not write null values to stream', TypeError);
createErrorType('ERR_UNKNOWN_ENCODING', function (arg) {
  return 'Unknown encoding: ' + arg;
}, TypeError);
createErrorType('ERR_STREAM_UNSHIFT_AFTER_END_EVENT', 'stream.unshift() after end event');
var codes_1 = codes;

var errorsBrowser = {
	codes: codes_1
};

var ERR_INVALID_OPT_VALUE = errorsBrowser.codes.ERR_INVALID_OPT_VALUE;

function highWaterMarkFrom(options, isDuplex, duplexKey) {
  return options.highWaterMark != null ? options.highWaterMark : isDuplex ? options[duplexKey] : null;
}

function getHighWaterMark$2(state, options, duplexKey, isDuplex) {
  var hwm = highWaterMarkFrom(options, isDuplex, duplexKey);

  if (hwm != null) {
    if (!(isFinite(hwm) && Math.floor(hwm) === hwm) || hwm < 0) {
      var name = isDuplex ? duplexKey : 'highWaterMark';
      throw new ERR_INVALID_OPT_VALUE(name, hwm);
    }

    return Math.floor(hwm);
  } // Default value


  return state.objectMode ? 16 : 16 * 1024;
}

var state = {
  getHighWaterMark: getHighWaterMark$2
};

var inherits_browser = createCommonjsModule(function (module) {
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    if (superCtor) {
      ctor.super_ = superCtor;
      ctor.prototype = Object.create(superCtor.prototype, {
        constructor: {
          value: ctor,
          enumerable: false,
          writable: true,
          configurable: true
        }
      });
    }
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    if (superCtor) {
      ctor.super_ = superCtor;
      var TempCtor = function () {};
      TempCtor.prototype = superCtor.prototype;
      ctor.prototype = new TempCtor();
      ctor.prototype.constructor = ctor;
    }
  };
}
});

/**
 * Module exports.
 */

var browser = deprecate;

/**
 * Mark that a method should not be used.
 * Returns a modified function which warns once by default.
 *
 * If `localStorage.noDeprecation = true` is set, then it is a no-op.
 *
 * If `localStorage.throwDeprecation = true` is set, then deprecated functions
 * will throw an Error when invoked.
 *
 * If `localStorage.traceDeprecation = true` is set, then deprecated functions
 * will invoke `console.trace()` instead of `console.error()`.
 *
 * @param {Function} fn - the function to deprecate
 * @param {String} msg - the string to print to the console when `fn` is invoked
 * @returns {Function} a new "deprecated" version of `fn`
 * @api public
 */

function deprecate (fn, msg) {
  if (config('noDeprecation')) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (config('throwDeprecation')) {
        throw new Error(msg);
      } else if (config('traceDeprecation')) {
        console.trace(msg);
      } else {
        console.warn(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
}

/**
 * Checks `localStorage` for boolean values for the given `name`.
 *
 * @param {String} name
 * @returns {Boolean}
 * @api private
 */

function config (name) {
  // accessing global.localStorage can trigger a DOMException in sandboxed iframes
  try {
    if (!commonjsGlobal.localStorage) return false;
  } catch (_) {
    return false;
  }
  var val = commonjsGlobal.localStorage[name];
  if (null == val) return false;
  return String(val).toLowerCase() === 'true';
}

var require$$2 = _stream_duplex;

var _stream_writable = Writable;
// there will be only 2 of these for each stream


function CorkedRequest(state) {
  var _this = this;

  this.next = null;
  this.entry = null;

  this.finish = function () {
    onCorkedFinish(_this, state);
  };
}
/* </replacement> */

/*<replacement>*/


var Duplex$2;
/*</replacement>*/

Writable.WritableState = WritableState;
/*<replacement>*/

var internalUtil = {
  deprecate: browser
};
/*</replacement>*/

/*<replacement>*/


/*</replacement>*/


var Buffer$2 = buffer.Buffer;

var OurUint8Array$1 = commonjsGlobal.Uint8Array || function () {};

function _uint8ArrayToBuffer$1(chunk) {
  return Buffer$2.from(chunk);
}

function _isUint8Array$1(obj) {
  return Buffer$2.isBuffer(obj) || obj instanceof OurUint8Array$1;
}



var getHighWaterMark$1 = state.getHighWaterMark;

var _require$codes$3 = errorsBrowser.codes,
    ERR_INVALID_ARG_TYPE$1 = _require$codes$3.ERR_INVALID_ARG_TYPE,
    ERR_METHOD_NOT_IMPLEMENTED$2 = _require$codes$3.ERR_METHOD_NOT_IMPLEMENTED,
    ERR_MULTIPLE_CALLBACK$1 = _require$codes$3.ERR_MULTIPLE_CALLBACK,
    ERR_STREAM_CANNOT_PIPE = _require$codes$3.ERR_STREAM_CANNOT_PIPE,
    ERR_STREAM_DESTROYED$1 = _require$codes$3.ERR_STREAM_DESTROYED,
    ERR_STREAM_NULL_VALUES = _require$codes$3.ERR_STREAM_NULL_VALUES,
    ERR_STREAM_WRITE_AFTER_END = _require$codes$3.ERR_STREAM_WRITE_AFTER_END,
    ERR_UNKNOWN_ENCODING = _require$codes$3.ERR_UNKNOWN_ENCODING;

var errorOrDestroy$1 = destroy_1.errorOrDestroy;

inherits_browser(Writable, streamBrowser);

function nop() {}

function WritableState(options, stream, isDuplex) {
  Duplex$2 = Duplex$2 || require$$2;
  options = options || {}; // Duplex streams are both readable and writable, but share
  // the same options object.
  // However, some cases require setting options to different
  // values for the readable and the writable sides of the duplex stream,
  // e.g. options.readableObjectMode vs. options.writableObjectMode, etc.

  if (typeof isDuplex !== 'boolean') isDuplex = stream instanceof Duplex$2; // object stream flag to indicate whether or not this stream
  // contains buffers or objects.

  this.objectMode = !!options.objectMode;
  if (isDuplex) this.objectMode = this.objectMode || !!options.writableObjectMode; // the point at which write() starts returning false
  // Note: 0 is a valid value, means that we always return false if
  // the entire buffer is not flushed immediately on write()

  this.highWaterMark = getHighWaterMark$1(this, options, 'writableHighWaterMark', isDuplex); // if _final has been called

  this.finalCalled = false; // drain event flag.

  this.needDrain = false; // at the start of calling end()

  this.ending = false; // when end() has been called, and returned

  this.ended = false; // when 'finish' is emitted

  this.finished = false; // has it been destroyed

  this.destroyed = false; // should we decode strings into buffers before passing to _write?
  // this is here so that some node-core streams can optimize string
  // handling at a lower level.

  var noDecode = options.decodeStrings === false;
  this.decodeStrings = !noDecode; // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.

  this.defaultEncoding = options.defaultEncoding || 'utf8'; // not an actual buffer we keep track of, but a measurement
  // of how much we're waiting to get pushed to some underlying
  // socket or file.

  this.length = 0; // a flag to see when we're in the middle of a write.

  this.writing = false; // when true all writes will be buffered until .uncork() call

  this.corked = 0; // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, because any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.

  this.sync = true; // a flag to know if we're processing previously buffered items, which
  // may call the _write() callback in the same tick, so that we don't
  // end up in an overlapped onwrite situation.

  this.bufferProcessing = false; // the callback that's passed to _write(chunk,cb)

  this.onwrite = function (er) {
    onwrite(stream, er);
  }; // the callback that the user supplies to write(chunk,encoding,cb)


  this.writecb = null; // the amount that is being written when _write is called.

  this.writelen = 0;
  this.bufferedRequest = null;
  this.lastBufferedRequest = null; // number of pending user-supplied write callbacks
  // this must be 0 before 'finish' can be emitted

  this.pendingcb = 0; // emit prefinish if the only thing we're waiting for is _write cbs
  // This is relevant for synchronous Transform streams

  this.prefinished = false; // True if the error was already emitted and should not be thrown again

  this.errorEmitted = false; // Should close be emitted on destroy. Defaults to true.

  this.emitClose = options.emitClose !== false; // Should .destroy() be called after 'finish' (and potentially 'end')

  this.autoDestroy = !!options.autoDestroy; // count buffered requests

  this.bufferedRequestCount = 0; // allocate the first CorkedRequest, there is always
  // one allocated and free to use, and we maintain at most two

  this.corkedRequestsFree = new CorkedRequest(this);
}

WritableState.prototype.getBuffer = function getBuffer() {
  var current = this.bufferedRequest;
  var out = [];

  while (current) {
    out.push(current);
    current = current.next;
  }

  return out;
};

(function () {
  try {
    Object.defineProperty(WritableState.prototype, 'buffer', {
      get: internalUtil.deprecate(function writableStateBufferGetter() {
        return this.getBuffer();
      }, '_writableState.buffer is deprecated. Use _writableState.getBuffer ' + 'instead.', 'DEP0003')
    });
  } catch (_) {}
})(); // Test _writableState for inheritance to account for Duplex streams,
// whose prototype chain only points to Readable.


var realHasInstance;

if (typeof Symbol === 'function' && Symbol.hasInstance && typeof Function.prototype[Symbol.hasInstance] === 'function') {
  realHasInstance = Function.prototype[Symbol.hasInstance];
  Object.defineProperty(Writable, Symbol.hasInstance, {
    value: function value(object) {
      if (realHasInstance.call(this, object)) return true;
      if (this !== Writable) return false;
      return object && object._writableState instanceof WritableState;
    }
  });
} else {
  realHasInstance = function realHasInstance(object) {
    return object instanceof this;
  };
}

function Writable(options) {
  Duplex$2 = Duplex$2 || require$$2; // Writable ctor is applied to Duplexes, too.
  // `realHasInstance` is necessary because using plain `instanceof`
  // would return false, as no `_writableState` property is attached.
  // Trying to use the custom `instanceof` for Writable here will also break the
  // Node.js LazyTransform implementation, which has a non-trivial getter for
  // `_writableState` that would lead to infinite recursion.
  // Checking for a Stream.Duplex instance is faster here instead of inside
  // the WritableState constructor, at least with V8 6.5

  var isDuplex = this instanceof Duplex$2;
  if (!isDuplex && !realHasInstance.call(Writable, this)) return new Writable(options);
  this._writableState = new WritableState(options, this, isDuplex); // legacy.

  this.writable = true;

  if (options) {
    if (typeof options.write === 'function') this._write = options.write;
    if (typeof options.writev === 'function') this._writev = options.writev;
    if (typeof options.destroy === 'function') this._destroy = options.destroy;
    if (typeof options.final === 'function') this._final = options.final;
  }

  streamBrowser.call(this);
} // Otherwise people can pipe Writable streams, which is just wrong.


Writable.prototype.pipe = function () {
  errorOrDestroy$1(this, new ERR_STREAM_CANNOT_PIPE());
};

function writeAfterEnd(stream, cb) {
  var er = new ERR_STREAM_WRITE_AFTER_END(); // TODO: defer error events consistently everywhere, not just the cb

  errorOrDestroy$1(stream, er);
  process.nextTick(cb, er);
} // Checks that a user-supplied chunk is valid, especially for the particular
// mode the stream is in. Currently this means that `null` is never accepted
// and undefined/non-string values are only allowed in object mode.


function validChunk(stream, state, chunk, cb) {
  var er;

  if (chunk === null) {
    er = new ERR_STREAM_NULL_VALUES();
  } else if (typeof chunk !== 'string' && !state.objectMode) {
    er = new ERR_INVALID_ARG_TYPE$1('chunk', ['string', 'Buffer'], chunk);
  }

  if (er) {
    errorOrDestroy$1(stream, er);
    process.nextTick(cb, er);
    return false;
  }

  return true;
}

Writable.prototype.write = function (chunk, encoding, cb) {
  var state = this._writableState;
  var ret = false;

  var isBuf = !state.objectMode && _isUint8Array$1(chunk);

  if (isBuf && !Buffer$2.isBuffer(chunk)) {
    chunk = _uint8ArrayToBuffer$1(chunk);
  }

  if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }

  if (isBuf) encoding = 'buffer';else if (!encoding) encoding = state.defaultEncoding;
  if (typeof cb !== 'function') cb = nop;
  if (state.ending) writeAfterEnd(this, cb);else if (isBuf || validChunk(this, state, chunk, cb)) {
    state.pendingcb++;
    ret = writeOrBuffer(this, state, isBuf, chunk, encoding, cb);
  }
  return ret;
};

Writable.prototype.cork = function () {
  this._writableState.corked++;
};

Writable.prototype.uncork = function () {
  var state = this._writableState;

  if (state.corked) {
    state.corked--;
    if (!state.writing && !state.corked && !state.bufferProcessing && state.bufferedRequest) clearBuffer(this, state);
  }
};

Writable.prototype.setDefaultEncoding = function setDefaultEncoding(encoding) {
  // node::ParseEncoding() requires lower case.
  if (typeof encoding === 'string') encoding = encoding.toLowerCase();
  if (!(['hex', 'utf8', 'utf-8', 'ascii', 'binary', 'base64', 'ucs2', 'ucs-2', 'utf16le', 'utf-16le', 'raw'].indexOf((encoding + '').toLowerCase()) > -1)) throw new ERR_UNKNOWN_ENCODING(encoding);
  this._writableState.defaultEncoding = encoding;
  return this;
};

Object.defineProperty(Writable.prototype, 'writableBuffer', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._writableState && this._writableState.getBuffer();
  }
});

function decodeChunk(state, chunk, encoding) {
  if (!state.objectMode && state.decodeStrings !== false && typeof chunk === 'string') {
    chunk = Buffer$2.from(chunk, encoding);
  }

  return chunk;
}

Object.defineProperty(Writable.prototype, 'writableHighWaterMark', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._writableState.highWaterMark;
  }
}); // if we're already writing something, then just put this
// in the queue, and wait our turn.  Otherwise, call _write
// If we return false, then we need a drain event, so set that flag.

function writeOrBuffer(stream, state, isBuf, chunk, encoding, cb) {
  if (!isBuf) {
    var newChunk = decodeChunk(state, chunk, encoding);

    if (chunk !== newChunk) {
      isBuf = true;
      encoding = 'buffer';
      chunk = newChunk;
    }
  }

  var len = state.objectMode ? 1 : chunk.length;
  state.length += len;
  var ret = state.length < state.highWaterMark; // we must ensure that previous needDrain will not be reset to false.

  if (!ret) state.needDrain = true;

  if (state.writing || state.corked) {
    var last = state.lastBufferedRequest;
    state.lastBufferedRequest = {
      chunk: chunk,
      encoding: encoding,
      isBuf: isBuf,
      callback: cb,
      next: null
    };

    if (last) {
      last.next = state.lastBufferedRequest;
    } else {
      state.bufferedRequest = state.lastBufferedRequest;
    }

    state.bufferedRequestCount += 1;
  } else {
    doWrite(stream, state, false, len, chunk, encoding, cb);
  }

  return ret;
}

function doWrite(stream, state, writev, len, chunk, encoding, cb) {
  state.writelen = len;
  state.writecb = cb;
  state.writing = true;
  state.sync = true;
  if (state.destroyed) state.onwrite(new ERR_STREAM_DESTROYED$1('write'));else if (writev) stream._writev(chunk, state.onwrite);else stream._write(chunk, encoding, state.onwrite);
  state.sync = false;
}

function onwriteError(stream, state, sync, er, cb) {
  --state.pendingcb;

  if (sync) {
    // defer the callback if we are being called synchronously
    // to avoid piling up things on the stack
    process.nextTick(cb, er); // this can emit finish, and it will always happen
    // after error

    process.nextTick(finishMaybe, stream, state);
    stream._writableState.errorEmitted = true;
    errorOrDestroy$1(stream, er);
  } else {
    // the caller expect this to happen before if
    // it is async
    cb(er);
    stream._writableState.errorEmitted = true;
    errorOrDestroy$1(stream, er); // this can emit finish, but finish must
    // always follow error

    finishMaybe(stream, state);
  }
}

function onwriteStateUpdate(state) {
  state.writing = false;
  state.writecb = null;
  state.length -= state.writelen;
  state.writelen = 0;
}

function onwrite(stream, er) {
  var state = stream._writableState;
  var sync = state.sync;
  var cb = state.writecb;
  if (typeof cb !== 'function') throw new ERR_MULTIPLE_CALLBACK$1();
  onwriteStateUpdate(state);
  if (er) onwriteError(stream, state, sync, er, cb);else {
    // Check if we're actually ready to finish, but don't emit yet
    var finished = needFinish(state) || stream.destroyed;

    if (!finished && !state.corked && !state.bufferProcessing && state.bufferedRequest) {
      clearBuffer(stream, state);
    }

    if (sync) {
      process.nextTick(afterWrite, stream, state, finished, cb);
    } else {
      afterWrite(stream, state, finished, cb);
    }
  }
}

function afterWrite(stream, state, finished, cb) {
  if (!finished) onwriteDrain(stream, state);
  state.pendingcb--;
  cb();
  finishMaybe(stream, state);
} // Must force callback to be called on nextTick, so that we don't
// emit 'drain' before the write() consumer gets the 'false' return
// value, and has a chance to attach a 'drain' listener.


function onwriteDrain(stream, state) {
  if (state.length === 0 && state.needDrain) {
    state.needDrain = false;
    stream.emit('drain');
  }
} // if there's something in the buffer waiting, then process it


function clearBuffer(stream, state) {
  state.bufferProcessing = true;
  var entry = state.bufferedRequest;

  if (stream._writev && entry && entry.next) {
    // Fast case, write everything using _writev()
    var l = state.bufferedRequestCount;
    var buffer = new Array(l);
    var holder = state.corkedRequestsFree;
    holder.entry = entry;
    var count = 0;
    var allBuffers = true;

    while (entry) {
      buffer[count] = entry;
      if (!entry.isBuf) allBuffers = false;
      entry = entry.next;
      count += 1;
    }

    buffer.allBuffers = allBuffers;
    doWrite(stream, state, true, state.length, buffer, '', holder.finish); // doWrite is almost always async, defer these to save a bit of time
    // as the hot path ends with doWrite

    state.pendingcb++;
    state.lastBufferedRequest = null;

    if (holder.next) {
      state.corkedRequestsFree = holder.next;
      holder.next = null;
    } else {
      state.corkedRequestsFree = new CorkedRequest(state);
    }

    state.bufferedRequestCount = 0;
  } else {
    // Slow case, write chunks one-by-one
    while (entry) {
      var chunk = entry.chunk;
      var encoding = entry.encoding;
      var cb = entry.callback;
      var len = state.objectMode ? 1 : chunk.length;
      doWrite(stream, state, false, len, chunk, encoding, cb);
      entry = entry.next;
      state.bufferedRequestCount--; // if we didn't call the onwrite immediately, then
      // it means that we need to wait until it does.
      // also, that means that the chunk and cb are currently
      // being processed, so move the buffer counter past them.

      if (state.writing) {
        break;
      }
    }

    if (entry === null) state.lastBufferedRequest = null;
  }

  state.bufferedRequest = entry;
  state.bufferProcessing = false;
}

Writable.prototype._write = function (chunk, encoding, cb) {
  cb(new ERR_METHOD_NOT_IMPLEMENTED$2('_write()'));
};

Writable.prototype._writev = null;

Writable.prototype.end = function (chunk, encoding, cb) {
  var state = this._writableState;

  if (typeof chunk === 'function') {
    cb = chunk;
    chunk = null;
    encoding = null;
  } else if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }

  if (chunk !== null && chunk !== undefined) this.write(chunk, encoding); // .end() fully uncorks

  if (state.corked) {
    state.corked = 1;
    this.uncork();
  } // ignore unnecessary end() calls.


  if (!state.ending) endWritable(this, state, cb);
  return this;
};

Object.defineProperty(Writable.prototype, 'writableLength', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._writableState.length;
  }
});

function needFinish(state) {
  return state.ending && state.length === 0 && state.bufferedRequest === null && !state.finished && !state.writing;
}

function callFinal(stream, state) {
  stream._final(function (err) {
    state.pendingcb--;

    if (err) {
      errorOrDestroy$1(stream, err);
    }

    state.prefinished = true;
    stream.emit('prefinish');
    finishMaybe(stream, state);
  });
}

function prefinish$1(stream, state) {
  if (!state.prefinished && !state.finalCalled) {
    if (typeof stream._final === 'function' && !state.destroyed) {
      state.pendingcb++;
      state.finalCalled = true;
      process.nextTick(callFinal, stream, state);
    } else {
      state.prefinished = true;
      stream.emit('prefinish');
    }
  }
}

function finishMaybe(stream, state) {
  var need = needFinish(state);

  if (need) {
    prefinish$1(stream, state);

    if (state.pendingcb === 0) {
      state.finished = true;
      stream.emit('finish');

      if (state.autoDestroy) {
        // In case of duplex streams we need a way to detect
        // if the readable side is ready for autoDestroy as well
        var rState = stream._readableState;

        if (!rState || rState.autoDestroy && rState.endEmitted) {
          stream.destroy();
        }
      }
    }
  }

  return need;
}

function endWritable(stream, state, cb) {
  state.ending = true;
  finishMaybe(stream, state);

  if (cb) {
    if (state.finished) process.nextTick(cb);else stream.once('finish', cb);
  }

  state.ended = true;
  stream.writable = false;
}

function onCorkedFinish(corkReq, state, err) {
  var entry = corkReq.entry;
  corkReq.entry = null;

  while (entry) {
    var cb = entry.callback;
    state.pendingcb--;
    cb(err);
    entry = entry.next;
  } // reuse the free corkReq.


  state.corkedRequestsFree.next = corkReq;
}

Object.defineProperty(Writable.prototype, 'destroyed', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    if (this._writableState === undefined) {
      return false;
    }

    return this._writableState.destroyed;
  },
  set: function set(value) {
    // we ignore the value if the stream
    // has not been initialized yet
    if (!this._writableState) {
      return;
    } // backward compatibility, the user is explicitly
    // managing destroyed


    this._writableState.destroyed = value;
  }
});
Writable.prototype.destroy = destroy_1.destroy;
Writable.prototype._undestroy = destroy_1.undestroy;

Writable.prototype._destroy = function (err, cb) {
  cb(err);
};

var require$$0 = _stream_readable;

/*<replacement>*/

var objectKeys = Object.keys || function (obj) {
  var keys = [];

  for (var key in obj) {
    keys.push(key);
  }

  return keys;
};
/*</replacement>*/


var _stream_duplex = Duplex$1;





inherits_browser(Duplex$1, require$$0);

{
  // Allow the keys array to be GC'ed.
  var keys = objectKeys(_stream_writable.prototype);

  for (var v = 0; v < keys.length; v++) {
    var method = keys[v];
    if (!Duplex$1.prototype[method]) Duplex$1.prototype[method] = _stream_writable.prototype[method];
  }
}

function Duplex$1(options) {
  if (!(this instanceof Duplex$1)) return new Duplex$1(options);
  require$$0.call(this, options);
  _stream_writable.call(this, options);
  this.allowHalfOpen = true;

  if (options) {
    if (options.readable === false) this.readable = false;
    if (options.writable === false) this.writable = false;

    if (options.allowHalfOpen === false) {
      this.allowHalfOpen = false;
      this.once('end', onend);
    }
  }
}

Object.defineProperty(Duplex$1.prototype, 'writableHighWaterMark', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._writableState.highWaterMark;
  }
});
Object.defineProperty(Duplex$1.prototype, 'writableBuffer', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._writableState && this._writableState.getBuffer();
  }
});
Object.defineProperty(Duplex$1.prototype, 'writableLength', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._writableState.length;
  }
}); // the no-half-open enforcer

function onend() {
  // If the writable side ended, then we're ok.
  if (this._writableState.ended) return; // no more data can be written.
  // But allow more writes to happen in this tick.

  process.nextTick(onEndNT, this);
}

function onEndNT(self) {
  self.end();
}

Object.defineProperty(Duplex$1.prototype, 'destroyed', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    if (this._readableState === undefined || this._writableState === undefined) {
      return false;
    }

    return this._readableState.destroyed && this._writableState.destroyed;
  },
  set: function set(value) {
    // we ignore the value if the stream
    // has not been initialized yet
    if (this._readableState === undefined || this._writableState === undefined) {
      return;
    } // backward compatibility, the user is explicitly
    // managing destroyed


    this._readableState.destroyed = value;
    this._writableState.destroyed = value;
  }
});

/*! safe-buffer. MIT License. Feross Aboukhadijeh <https://feross.org/opensource> */

var safeBuffer = createCommonjsModule(function (module, exports) {
/* eslint-disable node/no-deprecated-api */

var Buffer = buffer.Buffer;

// alternative to using Object.keys for old browsers
function copyProps (src, dst) {
  for (var key in src) {
    dst[key] = src[key];
  }
}
if (Buffer.from && Buffer.alloc && Buffer.allocUnsafe && Buffer.allocUnsafeSlow) {
  module.exports = buffer;
} else {
  // Copy properties from require('buffer')
  copyProps(buffer, exports);
  exports.Buffer = SafeBuffer;
}

function SafeBuffer (arg, encodingOrOffset, length) {
  return Buffer(arg, encodingOrOffset, length)
}

SafeBuffer.prototype = Object.create(Buffer.prototype);

// Copy static methods from Buffer
copyProps(Buffer, SafeBuffer);

SafeBuffer.from = function (arg, encodingOrOffset, length) {
  if (typeof arg === 'number') {
    throw new TypeError('Argument must not be a number')
  }
  return Buffer(arg, encodingOrOffset, length)
};

SafeBuffer.alloc = function (size, fill, encoding) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  var buf = Buffer(size);
  if (fill !== undefined) {
    if (typeof encoding === 'string') {
      buf.fill(fill, encoding);
    } else {
      buf.fill(fill);
    }
  } else {
    buf.fill(0);
  }
  return buf
};

SafeBuffer.allocUnsafe = function (size) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  return Buffer(size)
};

SafeBuffer.allocUnsafeSlow = function (size) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  return buffer.SlowBuffer(size)
};
});

/*<replacement>*/

var Buffer$1 = safeBuffer.Buffer;
/*</replacement>*/

var isEncoding = Buffer$1.isEncoding || function (encoding) {
  encoding = '' + encoding;
  switch (encoding && encoding.toLowerCase()) {
    case 'hex':case 'utf8':case 'utf-8':case 'ascii':case 'binary':case 'base64':case 'ucs2':case 'ucs-2':case 'utf16le':case 'utf-16le':case 'raw':
      return true;
    default:
      return false;
  }
};

function _normalizeEncoding(enc) {
  if (!enc) return 'utf8';
  var retried;
  while (true) {
    switch (enc) {
      case 'utf8':
      case 'utf-8':
        return 'utf8';
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return 'utf16le';
      case 'latin1':
      case 'binary':
        return 'latin1';
      case 'base64':
      case 'ascii':
      case 'hex':
        return enc;
      default:
        if (retried) return; // undefined
        enc = ('' + enc).toLowerCase();
        retried = true;
    }
  }
}
// Do not cache `Buffer.isEncoding` when checking encoding names as some
// modules monkey-patch it to support additional encodings
function normalizeEncoding(enc) {
  var nenc = _normalizeEncoding(enc);
  if (typeof nenc !== 'string' && (Buffer$1.isEncoding === isEncoding || !isEncoding(enc))) throw new Error('Unknown encoding: ' + enc);
  return nenc || enc;
}

// StringDecoder provides an interface for efficiently splitting a series of
// buffers into a series of JS strings without breaking apart multi-byte
// characters.
var StringDecoder_1 = StringDecoder$1;
function StringDecoder$1(encoding) {
  this.encoding = normalizeEncoding(encoding);
  var nb;
  switch (this.encoding) {
    case 'utf16le':
      this.text = utf16Text;
      this.end = utf16End;
      nb = 4;
      break;
    case 'utf8':
      this.fillLast = utf8FillLast;
      nb = 4;
      break;
    case 'base64':
      this.text = base64Text;
      this.end = base64End;
      nb = 3;
      break;
    default:
      this.write = simpleWrite;
      this.end = simpleEnd;
      return;
  }
  this.lastNeed = 0;
  this.lastTotal = 0;
  this.lastChar = Buffer$1.allocUnsafe(nb);
}

StringDecoder$1.prototype.write = function (buf) {
  if (buf.length === 0) return '';
  var r;
  var i;
  if (this.lastNeed) {
    r = this.fillLast(buf);
    if (r === undefined) return '';
    i = this.lastNeed;
    this.lastNeed = 0;
  } else {
    i = 0;
  }
  if (i < buf.length) return r ? r + this.text(buf, i) : this.text(buf, i);
  return r || '';
};

StringDecoder$1.prototype.end = utf8End;

// Returns only complete characters in a Buffer
StringDecoder$1.prototype.text = utf8Text;

// Attempts to complete a partial non-UTF-8 character using bytes from a Buffer
StringDecoder$1.prototype.fillLast = function (buf) {
  if (this.lastNeed <= buf.length) {
    buf.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, this.lastNeed);
    return this.lastChar.toString(this.encoding, 0, this.lastTotal);
  }
  buf.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, buf.length);
  this.lastNeed -= buf.length;
};

// Checks the type of a UTF-8 byte, whether it's ASCII, a leading byte, or a
// continuation byte. If an invalid byte is detected, -2 is returned.
function utf8CheckByte(byte) {
  if (byte <= 0x7F) return 0;else if (byte >> 5 === 0x06) return 2;else if (byte >> 4 === 0x0E) return 3;else if (byte >> 3 === 0x1E) return 4;
  return byte >> 6 === 0x02 ? -1 : -2;
}

// Checks at most 3 bytes at the end of a Buffer in order to detect an
// incomplete multi-byte UTF-8 character. The total number of bytes (2, 3, or 4)
// needed to complete the UTF-8 character (if applicable) are returned.
function utf8CheckIncomplete(self, buf, i) {
  var j = buf.length - 1;
  if (j < i) return 0;
  var nb = utf8CheckByte(buf[j]);
  if (nb >= 0) {
    if (nb > 0) self.lastNeed = nb - 1;
    return nb;
  }
  if (--j < i || nb === -2) return 0;
  nb = utf8CheckByte(buf[j]);
  if (nb >= 0) {
    if (nb > 0) self.lastNeed = nb - 2;
    return nb;
  }
  if (--j < i || nb === -2) return 0;
  nb = utf8CheckByte(buf[j]);
  if (nb >= 0) {
    if (nb > 0) {
      if (nb === 2) nb = 0;else self.lastNeed = nb - 3;
    }
    return nb;
  }
  return 0;
}

// Validates as many continuation bytes for a multi-byte UTF-8 character as
// needed or are available. If we see a non-continuation byte where we expect
// one, we "replace" the validated continuation bytes we've seen so far with
// a single UTF-8 replacement character ('\ufffd'), to match v8's UTF-8 decoding
// behavior. The continuation byte check is included three times in the case
// where all of the continuation bytes for a character exist in the same buffer.
// It is also done this way as a slight performance increase instead of using a
// loop.
function utf8CheckExtraBytes(self, buf, p) {
  if ((buf[0] & 0xC0) !== 0x80) {
    self.lastNeed = 0;
    return '\ufffd';
  }
  if (self.lastNeed > 1 && buf.length > 1) {
    if ((buf[1] & 0xC0) !== 0x80) {
      self.lastNeed = 1;
      return '\ufffd';
    }
    if (self.lastNeed > 2 && buf.length > 2) {
      if ((buf[2] & 0xC0) !== 0x80) {
        self.lastNeed = 2;
        return '\ufffd';
      }
    }
  }
}

// Attempts to complete a multi-byte UTF-8 character using bytes from a Buffer.
function utf8FillLast(buf) {
  var p = this.lastTotal - this.lastNeed;
  var r = utf8CheckExtraBytes(this, buf);
  if (r !== undefined) return r;
  if (this.lastNeed <= buf.length) {
    buf.copy(this.lastChar, p, 0, this.lastNeed);
    return this.lastChar.toString(this.encoding, 0, this.lastTotal);
  }
  buf.copy(this.lastChar, p, 0, buf.length);
  this.lastNeed -= buf.length;
}

// Returns all complete UTF-8 characters in a Buffer. If the Buffer ended on a
// partial character, the character's bytes are buffered until the required
// number of bytes are available.
function utf8Text(buf, i) {
  var total = utf8CheckIncomplete(this, buf, i);
  if (!this.lastNeed) return buf.toString('utf8', i);
  this.lastTotal = total;
  var end = buf.length - (total - this.lastNeed);
  buf.copy(this.lastChar, 0, end);
  return buf.toString('utf8', i, end);
}

// For UTF-8, a replacement character is added when ending on a partial
// character.
function utf8End(buf) {
  var r = buf && buf.length ? this.write(buf) : '';
  if (this.lastNeed) return r + '\ufffd';
  return r;
}

// UTF-16LE typically needs two bytes per character, but even if we have an even
// number of bytes available, we need to check if we end on a leading/high
// surrogate. In that case, we need to wait for the next two bytes in order to
// decode the last character properly.
function utf16Text(buf, i) {
  if ((buf.length - i) % 2 === 0) {
    var r = buf.toString('utf16le', i);
    if (r) {
      var c = r.charCodeAt(r.length - 1);
      if (c >= 0xD800 && c <= 0xDBFF) {
        this.lastNeed = 2;
        this.lastTotal = 4;
        this.lastChar[0] = buf[buf.length - 2];
        this.lastChar[1] = buf[buf.length - 1];
        return r.slice(0, -1);
      }
    }
    return r;
  }
  this.lastNeed = 1;
  this.lastTotal = 2;
  this.lastChar[0] = buf[buf.length - 1];
  return buf.toString('utf16le', i, buf.length - 1);
}

// For UTF-16LE we do not explicitly append special replacement characters if we
// end on a partial character, we simply let v8 handle that.
function utf16End(buf) {
  var r = buf && buf.length ? this.write(buf) : '';
  if (this.lastNeed) {
    var end = this.lastTotal - this.lastNeed;
    return r + this.lastChar.toString('utf16le', 0, end);
  }
  return r;
}

function base64Text(buf, i) {
  var n = (buf.length - i) % 3;
  if (n === 0) return buf.toString('base64', i);
  this.lastNeed = 3 - n;
  this.lastTotal = 3;
  if (n === 1) {
    this.lastChar[0] = buf[buf.length - 1];
  } else {
    this.lastChar[0] = buf[buf.length - 2];
    this.lastChar[1] = buf[buf.length - 1];
  }
  return buf.toString('base64', i, buf.length - n);
}

function base64End(buf) {
  var r = buf && buf.length ? this.write(buf) : '';
  if (this.lastNeed) return r + this.lastChar.toString('base64', 0, 3 - this.lastNeed);
  return r;
}

// Pass bytes on through for single-byte encodings (e.g. ascii, latin1, hex)
function simpleWrite(buf) {
  return buf.toString(this.encoding);
}

function simpleEnd(buf) {
  return buf && buf.length ? this.write(buf) : '';
}

var string_decoder = {
	StringDecoder: StringDecoder_1
};

var ERR_STREAM_PREMATURE_CLOSE = errorsBrowser.codes.ERR_STREAM_PREMATURE_CLOSE;

function once$1(callback) {
  var called = false;
  return function () {
    if (called) return;
    called = true;

    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    callback.apply(this, args);
  };
}

function noop$1() {}

function isRequest$1(stream) {
  return stream.setHeader && typeof stream.abort === 'function';
}

function eos$1(stream, opts, callback) {
  if (typeof opts === 'function') return eos$1(stream, null, opts);
  if (!opts) opts = {};
  callback = once$1(callback || noop$1);
  var readable = opts.readable || opts.readable !== false && stream.readable;
  var writable = opts.writable || opts.writable !== false && stream.writable;

  var onlegacyfinish = function onlegacyfinish() {
    if (!stream.writable) onfinish();
  };

  var writableEnded = stream._writableState && stream._writableState.finished;

  var onfinish = function onfinish() {
    writable = false;
    writableEnded = true;
    if (!readable) callback.call(stream);
  };

  var readableEnded = stream._readableState && stream._readableState.endEmitted;

  var onend = function onend() {
    readable = false;
    readableEnded = true;
    if (!writable) callback.call(stream);
  };

  var onerror = function onerror(err) {
    callback.call(stream, err);
  };

  var onclose = function onclose() {
    var err;

    if (readable && !readableEnded) {
      if (!stream._readableState || !stream._readableState.ended) err = new ERR_STREAM_PREMATURE_CLOSE();
      return callback.call(stream, err);
    }

    if (writable && !writableEnded) {
      if (!stream._writableState || !stream._writableState.ended) err = new ERR_STREAM_PREMATURE_CLOSE();
      return callback.call(stream, err);
    }
  };

  var onrequest = function onrequest() {
    stream.req.on('finish', onfinish);
  };

  if (isRequest$1(stream)) {
    stream.on('complete', onfinish);
    stream.on('abort', onclose);
    if (stream.req) onrequest();else stream.on('request', onrequest);
  } else if (writable && !stream._writableState) {
    // legacy streams
    stream.on('end', onlegacyfinish);
    stream.on('close', onlegacyfinish);
  }

  stream.on('end', onend);
  stream.on('finish', onfinish);
  if (opts.error !== false) stream.on('error', onerror);
  stream.on('close', onclose);
  return function () {
    stream.removeListener('complete', onfinish);
    stream.removeListener('abort', onclose);
    stream.removeListener('request', onrequest);
    if (stream.req) stream.req.removeListener('finish', onfinish);
    stream.removeListener('end', onlegacyfinish);
    stream.removeListener('close', onlegacyfinish);
    stream.removeListener('finish', onfinish);
    stream.removeListener('end', onend);
    stream.removeListener('error', onerror);
    stream.removeListener('close', onclose);
  };
}

var endOfStream = eos$1;

var _Object$setPrototypeO;

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }



var kLastResolve = Symbol('lastResolve');
var kLastReject = Symbol('lastReject');
var kError = Symbol('error');
var kEnded = Symbol('ended');
var kLastPromise = Symbol('lastPromise');
var kHandlePromise = Symbol('handlePromise');
var kStream = Symbol('stream');

function createIterResult(value, done) {
  return {
    value: value,
    done: done
  };
}

function readAndResolve(iter) {
  var resolve = iter[kLastResolve];

  if (resolve !== null) {
    var data = iter[kStream].read(); // we defer if data is null
    // we can be expecting either 'end' or
    // 'error'

    if (data !== null) {
      iter[kLastPromise] = null;
      iter[kLastResolve] = null;
      iter[kLastReject] = null;
      resolve(createIterResult(data, false));
    }
  }
}

function onReadable(iter) {
  // we wait for the next tick, because it might
  // emit an error with process.nextTick
  process.nextTick(readAndResolve, iter);
}

function wrapForNext(lastPromise, iter) {
  return function (resolve, reject) {
    lastPromise.then(function () {
      if (iter[kEnded]) {
        resolve(createIterResult(undefined, true));
        return;
      }

      iter[kHandlePromise](resolve, reject);
    }, reject);
  };
}

var AsyncIteratorPrototype = Object.getPrototypeOf(function () {});
var ReadableStreamAsyncIteratorPrototype = Object.setPrototypeOf((_Object$setPrototypeO = {
  get stream() {
    return this[kStream];
  },

  next: function next() {
    var _this = this;

    // if we have detected an error in the meanwhile
    // reject straight away
    var error = this[kError];

    if (error !== null) {
      return Promise.reject(error);
    }

    if (this[kEnded]) {
      return Promise.resolve(createIterResult(undefined, true));
    }

    if (this[kStream].destroyed) {
      // We need to defer via nextTick because if .destroy(err) is
      // called, the error will be emitted via nextTick, and
      // we cannot guarantee that there is no error lingering around
      // waiting to be emitted.
      return new Promise(function (resolve, reject) {
        process.nextTick(function () {
          if (_this[kError]) {
            reject(_this[kError]);
          } else {
            resolve(createIterResult(undefined, true));
          }
        });
      });
    } // if we have multiple next() calls
    // we will wait for the previous Promise to finish
    // this logic is optimized to support for await loops,
    // where next() is only called once at a time


    var lastPromise = this[kLastPromise];
    var promise;

    if (lastPromise) {
      promise = new Promise(wrapForNext(lastPromise, this));
    } else {
      // fast path needed to support multiple this.push()
      // without triggering the next() queue
      var data = this[kStream].read();

      if (data !== null) {
        return Promise.resolve(createIterResult(data, false));
      }

      promise = new Promise(this[kHandlePromise]);
    }

    this[kLastPromise] = promise;
    return promise;
  }
}, _defineProperty(_Object$setPrototypeO, Symbol.asyncIterator, function () {
  return this;
}), _defineProperty(_Object$setPrototypeO, "return", function _return() {
  var _this2 = this;

  // destroy(err, cb) is a private API
  // we can guarantee we have that here, because we control the
  // Readable class this is attached to
  return new Promise(function (resolve, reject) {
    _this2[kStream].destroy(null, function (err) {
      if (err) {
        reject(err);
        return;
      }

      resolve(createIterResult(undefined, true));
    });
  });
}), _Object$setPrototypeO), AsyncIteratorPrototype);

var createReadableStreamAsyncIterator$1 = function createReadableStreamAsyncIterator(stream) {
  var _Object$create;

  var iterator = Object.create(ReadableStreamAsyncIteratorPrototype, (_Object$create = {}, _defineProperty(_Object$create, kStream, {
    value: stream,
    writable: true
  }), _defineProperty(_Object$create, kLastResolve, {
    value: null,
    writable: true
  }), _defineProperty(_Object$create, kLastReject, {
    value: null,
    writable: true
  }), _defineProperty(_Object$create, kError, {
    value: null,
    writable: true
  }), _defineProperty(_Object$create, kEnded, {
    value: stream._readableState.endEmitted,
    writable: true
  }), _defineProperty(_Object$create, kHandlePromise, {
    value: function value(resolve, reject) {
      var data = iterator[kStream].read();

      if (data) {
        iterator[kLastPromise] = null;
        iterator[kLastResolve] = null;
        iterator[kLastReject] = null;
        resolve(createIterResult(data, false));
      } else {
        iterator[kLastResolve] = resolve;
        iterator[kLastReject] = reject;
      }
    },
    writable: true
  }), _Object$create));
  iterator[kLastPromise] = null;
  endOfStream(stream, function (err) {
    if (err && err.code !== 'ERR_STREAM_PREMATURE_CLOSE') {
      var reject = iterator[kLastReject]; // reject if we are waiting for data in the Promise
      // returned by next() and store the error

      if (reject !== null) {
        iterator[kLastPromise] = null;
        iterator[kLastResolve] = null;
        iterator[kLastReject] = null;
        reject(err);
      }

      iterator[kError] = err;
      return;
    }

    var resolve = iterator[kLastResolve];

    if (resolve !== null) {
      iterator[kLastPromise] = null;
      iterator[kLastResolve] = null;
      iterator[kLastReject] = null;
      resolve(createIterResult(undefined, true));
    }

    iterator[kEnded] = true;
  });
  stream.on('readable', onReadable.bind(null, iterator));
  return iterator;
};

var async_iterator = createReadableStreamAsyncIterator$1;

var fromBrowser = function () {
  throw new Error('Readable.from is not available in the browser')
};

var _stream_readable = Readable;
/*<replacement>*/

var Duplex;
/*</replacement>*/

Readable.ReadableState = ReadableState;
/*<replacement>*/

require$$0$1.EventEmitter;

var EElistenerCount = function EElistenerCount(emitter, type) {
  return emitter.listeners(type).length;
};
/*</replacement>*/

/*<replacement>*/



/*</replacement>*/


var Buffer = buffer.Buffer;

var OurUint8Array = commonjsGlobal.Uint8Array || function () {};

function _uint8ArrayToBuffer(chunk) {
  return Buffer.from(chunk);
}

function _isUint8Array(obj) {
  return Buffer.isBuffer(obj) || obj instanceof OurUint8Array;
}
/*<replacement>*/




var debug;

if (debugUtil && debugUtil.debuglog) {
  debug = debugUtil.debuglog('stream');
} else {
  debug = function debug() {};
}
/*</replacement>*/






var getHighWaterMark = state.getHighWaterMark;

var _require$codes$2 = errorsBrowser.codes,
    ERR_INVALID_ARG_TYPE = _require$codes$2.ERR_INVALID_ARG_TYPE,
    ERR_STREAM_PUSH_AFTER_EOF = _require$codes$2.ERR_STREAM_PUSH_AFTER_EOF,
    ERR_METHOD_NOT_IMPLEMENTED$1 = _require$codes$2.ERR_METHOD_NOT_IMPLEMENTED,
    ERR_STREAM_UNSHIFT_AFTER_END_EVENT = _require$codes$2.ERR_STREAM_UNSHIFT_AFTER_END_EVENT; // Lazy loaded to improve the startup performance.


var StringDecoder;
var createReadableStreamAsyncIterator;
var from;

inherits_browser(Readable, streamBrowser);

var errorOrDestroy = destroy_1.errorOrDestroy;
var kProxyEvents = ['error', 'close', 'destroy', 'pause', 'resume'];

function prependListener(emitter, event, fn) {
  // Sadly this is not cacheable as some libraries bundle their own
  // event emitter implementation with them.
  if (typeof emitter.prependListener === 'function') return emitter.prependListener(event, fn); // This is a hack to make sure that our error handler is attached before any
  // userland ones.  NEVER DO THIS. This is here only because this code needs
  // to continue to work with older versions of Node.js that do not include
  // the prependListener() method. The goal is to eventually remove this hack.

  if (!emitter._events || !emitter._events[event]) emitter.on(event, fn);else if (Array.isArray(emitter._events[event])) emitter._events[event].unshift(fn);else emitter._events[event] = [fn, emitter._events[event]];
}

function ReadableState(options, stream, isDuplex) {
  Duplex = Duplex || require$$2;
  options = options || {}; // Duplex streams are both readable and writable, but share
  // the same options object.
  // However, some cases require setting options to different
  // values for the readable and the writable sides of the duplex stream.
  // These options can be provided separately as readableXXX and writableXXX.

  if (typeof isDuplex !== 'boolean') isDuplex = stream instanceof Duplex; // object stream flag. Used to make read(n) ignore n and to
  // make all the buffer merging and length checks go away

  this.objectMode = !!options.objectMode;
  if (isDuplex) this.objectMode = this.objectMode || !!options.readableObjectMode; // the point at which it stops calling _read() to fill the buffer
  // Note: 0 is a valid value, means "don't call _read preemptively ever"

  this.highWaterMark = getHighWaterMark(this, options, 'readableHighWaterMark', isDuplex); // A linked list is used to store data chunks instead of an array because the
  // linked list can remove elements from the beginning faster than
  // array.shift()

  this.buffer = new buffer_list();
  this.length = 0;
  this.pipes = null;
  this.pipesCount = 0;
  this.flowing = null;
  this.ended = false;
  this.endEmitted = false;
  this.reading = false; // a flag to be able to tell if the event 'readable'/'data' is emitted
  // immediately, or on a later tick.  We set this to true at first, because
  // any actions that shouldn't happen until "later" should generally also
  // not happen before the first read call.

  this.sync = true; // whenever we return null, then we set a flag to say
  // that we're awaiting a 'readable' event emission.

  this.needReadable = false;
  this.emittedReadable = false;
  this.readableListening = false;
  this.resumeScheduled = false;
  this.paused = true; // Should close be emitted on destroy. Defaults to true.

  this.emitClose = options.emitClose !== false; // Should .destroy() be called after 'end' (and potentially 'finish')

  this.autoDestroy = !!options.autoDestroy; // has it been destroyed

  this.destroyed = false; // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.

  this.defaultEncoding = options.defaultEncoding || 'utf8'; // the number of writers that are awaiting a drain event in .pipe()s

  this.awaitDrain = 0; // if true, a maybeReadMore has been scheduled

  this.readingMore = false;
  this.decoder = null;
  this.encoding = null;

  if (options.encoding) {
    if (!StringDecoder) StringDecoder = string_decoder.StringDecoder;
    this.decoder = new StringDecoder(options.encoding);
    this.encoding = options.encoding;
  }
}

function Readable(options) {
  Duplex = Duplex || require$$2;
  if (!(this instanceof Readable)) return new Readable(options); // Checking for a Stream.Duplex instance is faster here instead of inside
  // the ReadableState constructor, at least with V8 6.5

  var isDuplex = this instanceof Duplex;
  this._readableState = new ReadableState(options, this, isDuplex); // legacy

  this.readable = true;

  if (options) {
    if (typeof options.read === 'function') this._read = options.read;
    if (typeof options.destroy === 'function') this._destroy = options.destroy;
  }

  streamBrowser.call(this);
}

Object.defineProperty(Readable.prototype, 'destroyed', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    if (this._readableState === undefined) {
      return false;
    }

    return this._readableState.destroyed;
  },
  set: function set(value) {
    // we ignore the value if the stream
    // has not been initialized yet
    if (!this._readableState) {
      return;
    } // backward compatibility, the user is explicitly
    // managing destroyed


    this._readableState.destroyed = value;
  }
});
Readable.prototype.destroy = destroy_1.destroy;
Readable.prototype._undestroy = destroy_1.undestroy;

Readable.prototype._destroy = function (err, cb) {
  cb(err);
}; // Manually shove something into the read() buffer.
// This returns true if the highWaterMark has not been hit yet,
// similar to how Writable.write() returns true if you should
// write() some more.


Readable.prototype.push = function (chunk, encoding) {
  var state = this._readableState;
  var skipChunkCheck;

  if (!state.objectMode) {
    if (typeof chunk === 'string') {
      encoding = encoding || state.defaultEncoding;

      if (encoding !== state.encoding) {
        chunk = Buffer.from(chunk, encoding);
        encoding = '';
      }

      skipChunkCheck = true;
    }
  } else {
    skipChunkCheck = true;
  }

  return readableAddChunk(this, chunk, encoding, false, skipChunkCheck);
}; // Unshift should *always* be something directly out of read()


Readable.prototype.unshift = function (chunk) {
  return readableAddChunk(this, chunk, null, true, false);
};

function readableAddChunk(stream, chunk, encoding, addToFront, skipChunkCheck) {
  debug('readableAddChunk', chunk);
  var state = stream._readableState;

  if (chunk === null) {
    state.reading = false;
    onEofChunk(stream, state);
  } else {
    var er;
    if (!skipChunkCheck) er = chunkInvalid(state, chunk);

    if (er) {
      errorOrDestroy(stream, er);
    } else if (state.objectMode || chunk && chunk.length > 0) {
      if (typeof chunk !== 'string' && !state.objectMode && Object.getPrototypeOf(chunk) !== Buffer.prototype) {
        chunk = _uint8ArrayToBuffer(chunk);
      }

      if (addToFront) {
        if (state.endEmitted) errorOrDestroy(stream, new ERR_STREAM_UNSHIFT_AFTER_END_EVENT());else addChunk(stream, state, chunk, true);
      } else if (state.ended) {
        errorOrDestroy(stream, new ERR_STREAM_PUSH_AFTER_EOF());
      } else if (state.destroyed) {
        return false;
      } else {
        state.reading = false;

        if (state.decoder && !encoding) {
          chunk = state.decoder.write(chunk);
          if (state.objectMode || chunk.length !== 0) addChunk(stream, state, chunk, false);else maybeReadMore(stream, state);
        } else {
          addChunk(stream, state, chunk, false);
        }
      }
    } else if (!addToFront) {
      state.reading = false;
      maybeReadMore(stream, state);
    }
  } // We can push more data if we are below the highWaterMark.
  // Also, if we have no data yet, we can stand some more bytes.
  // This is to work around cases where hwm=0, such as the repl.


  return !state.ended && (state.length < state.highWaterMark || state.length === 0);
}

function addChunk(stream, state, chunk, addToFront) {
  if (state.flowing && state.length === 0 && !state.sync) {
    state.awaitDrain = 0;
    stream.emit('data', chunk);
  } else {
    // update the buffer info.
    state.length += state.objectMode ? 1 : chunk.length;
    if (addToFront) state.buffer.unshift(chunk);else state.buffer.push(chunk);
    if (state.needReadable) emitReadable(stream);
  }

  maybeReadMore(stream, state);
}

function chunkInvalid(state, chunk) {
  var er;

  if (!_isUint8Array(chunk) && typeof chunk !== 'string' && chunk !== undefined && !state.objectMode) {
    er = new ERR_INVALID_ARG_TYPE('chunk', ['string', 'Buffer', 'Uint8Array'], chunk);
  }

  return er;
}

Readable.prototype.isPaused = function () {
  return this._readableState.flowing === false;
}; // backwards compatibility.


Readable.prototype.setEncoding = function (enc) {
  if (!StringDecoder) StringDecoder = string_decoder.StringDecoder;
  var decoder = new StringDecoder(enc);
  this._readableState.decoder = decoder; // If setEncoding(null), decoder.encoding equals utf8

  this._readableState.encoding = this._readableState.decoder.encoding; // Iterate over current buffer to convert already stored Buffers:

  var p = this._readableState.buffer.head;
  var content = '';

  while (p !== null) {
    content += decoder.write(p.data);
    p = p.next;
  }

  this._readableState.buffer.clear();

  if (content !== '') this._readableState.buffer.push(content);
  this._readableState.length = content.length;
  return this;
}; // Don't raise the hwm > 1GB


var MAX_HWM = 0x40000000;

function computeNewHighWaterMark(n) {
  if (n >= MAX_HWM) {
    // TODO(ronag): Throw ERR_VALUE_OUT_OF_RANGE.
    n = MAX_HWM;
  } else {
    // Get the next highest power of 2 to prevent increasing hwm excessively in
    // tiny amounts
    n--;
    n |= n >>> 1;
    n |= n >>> 2;
    n |= n >>> 4;
    n |= n >>> 8;
    n |= n >>> 16;
    n++;
  }

  return n;
} // This function is designed to be inlinable, so please take care when making
// changes to the function body.


function howMuchToRead(n, state) {
  if (n <= 0 || state.length === 0 && state.ended) return 0;
  if (state.objectMode) return 1;

  if (n !== n) {
    // Only flow one buffer at a time
    if (state.flowing && state.length) return state.buffer.head.data.length;else return state.length;
  } // If we're asking for more than the current hwm, then raise the hwm.


  if (n > state.highWaterMark) state.highWaterMark = computeNewHighWaterMark(n);
  if (n <= state.length) return n; // Don't have enough

  if (!state.ended) {
    state.needReadable = true;
    return 0;
  }

  return state.length;
} // you can override either this method, or the async _read(n) below.


Readable.prototype.read = function (n) {
  debug('read', n);
  n = parseInt(n, 10);
  var state = this._readableState;
  var nOrig = n;
  if (n !== 0) state.emittedReadable = false; // if we're doing read(0) to trigger a readable event, but we
  // already have a bunch of data in the buffer, then just trigger
  // the 'readable' event and move on.

  if (n === 0 && state.needReadable && ((state.highWaterMark !== 0 ? state.length >= state.highWaterMark : state.length > 0) || state.ended)) {
    debug('read: emitReadable', state.length, state.ended);
    if (state.length === 0 && state.ended) endReadable(this);else emitReadable(this);
    return null;
  }

  n = howMuchToRead(n, state); // if we've ended, and we're now clear, then finish it up.

  if (n === 0 && state.ended) {
    if (state.length === 0) endReadable(this);
    return null;
  } // All the actual chunk generation logic needs to be
  // *below* the call to _read.  The reason is that in certain
  // synthetic stream cases, such as passthrough streams, _read
  // may be a completely synchronous operation which may change
  // the state of the read buffer, providing enough data when
  // before there was *not* enough.
  //
  // So, the steps are:
  // 1. Figure out what the state of things will be after we do
  // a read from the buffer.
  //
  // 2. If that resulting state will trigger a _read, then call _read.
  // Note that this may be asynchronous, or synchronous.  Yes, it is
  // deeply ugly to write APIs this way, but that still doesn't mean
  // that the Readable class should behave improperly, as streams are
  // designed to be sync/async agnostic.
  // Take note if the _read call is sync or async (ie, if the read call
  // has returned yet), so that we know whether or not it's safe to emit
  // 'readable' etc.
  //
  // 3. Actually pull the requested chunks out of the buffer and return.
  // if we need a readable event, then we need to do some reading.


  var doRead = state.needReadable;
  debug('need readable', doRead); // if we currently have less than the highWaterMark, then also read some

  if (state.length === 0 || state.length - n < state.highWaterMark) {
    doRead = true;
    debug('length less than watermark', doRead);
  } // however, if we've ended, then there's no point, and if we're already
  // reading, then it's unnecessary.


  if (state.ended || state.reading) {
    doRead = false;
    debug('reading or ended', doRead);
  } else if (doRead) {
    debug('do read');
    state.reading = true;
    state.sync = true; // if the length is currently zero, then we *need* a readable event.

    if (state.length === 0) state.needReadable = true; // call internal read method

    this._read(state.highWaterMark);

    state.sync = false; // If _read pushed data synchronously, then `reading` will be false,
    // and we need to re-evaluate how much data we can return to the user.

    if (!state.reading) n = howMuchToRead(nOrig, state);
  }

  var ret;
  if (n > 0) ret = fromList(n, state);else ret = null;

  if (ret === null) {
    state.needReadable = state.length <= state.highWaterMark;
    n = 0;
  } else {
    state.length -= n;
    state.awaitDrain = 0;
  }

  if (state.length === 0) {
    // If we have nothing in the buffer, then we want to know
    // as soon as we *do* get something into the buffer.
    if (!state.ended) state.needReadable = true; // If we tried to read() past the EOF, then emit end on the next tick.

    if (nOrig !== n && state.ended) endReadable(this);
  }

  if (ret !== null) this.emit('data', ret);
  return ret;
};

function onEofChunk(stream, state) {
  debug('onEofChunk');
  if (state.ended) return;

  if (state.decoder) {
    var chunk = state.decoder.end();

    if (chunk && chunk.length) {
      state.buffer.push(chunk);
      state.length += state.objectMode ? 1 : chunk.length;
    }
  }

  state.ended = true;

  if (state.sync) {
    // if we are sync, wait until next tick to emit the data.
    // Otherwise we risk emitting data in the flow()
    // the readable code triggers during a read() call
    emitReadable(stream);
  } else {
    // emit 'readable' now to make sure it gets picked up.
    state.needReadable = false;

    if (!state.emittedReadable) {
      state.emittedReadable = true;
      emitReadable_(stream);
    }
  }
} // Don't emit readable right away in sync mode, because this can trigger
// another read() call => stack overflow.  This way, it might trigger
// a nextTick recursion warning, but that's not so bad.


function emitReadable(stream) {
  var state = stream._readableState;
  debug('emitReadable', state.needReadable, state.emittedReadable);
  state.needReadable = false;

  if (!state.emittedReadable) {
    debug('emitReadable', state.flowing);
    state.emittedReadable = true;
    process.nextTick(emitReadable_, stream);
  }
}

function emitReadable_(stream) {
  var state = stream._readableState;
  debug('emitReadable_', state.destroyed, state.length, state.ended);

  if (!state.destroyed && (state.length || state.ended)) {
    stream.emit('readable');
    state.emittedReadable = false;
  } // The stream needs another readable event if
  // 1. It is not flowing, as the flow mechanism will take
  //    care of it.
  // 2. It is not ended.
  // 3. It is below the highWaterMark, so we can schedule
  //    another readable later.


  state.needReadable = !state.flowing && !state.ended && state.length <= state.highWaterMark;
  flow(stream);
} // at this point, the user has presumably seen the 'readable' event,
// and called read() to consume some data.  that may have triggered
// in turn another _read(n) call, in which case reading = true if
// it's in progress.
// However, if we're not ended, or reading, and the length < hwm,
// then go ahead and try to read some more preemptively.


function maybeReadMore(stream, state) {
  if (!state.readingMore) {
    state.readingMore = true;
    process.nextTick(maybeReadMore_, stream, state);
  }
}

function maybeReadMore_(stream, state) {
  // Attempt to read more data if we should.
  //
  // The conditions for reading more data are (one of):
  // - Not enough data buffered (state.length < state.highWaterMark). The loop
  //   is responsible for filling the buffer with enough data if such data
  //   is available. If highWaterMark is 0 and we are not in the flowing mode
  //   we should _not_ attempt to buffer any extra data. We'll get more data
  //   when the stream consumer calls read() instead.
  // - No data in the buffer, and the stream is in flowing mode. In this mode
  //   the loop below is responsible for ensuring read() is called. Failing to
  //   call read here would abort the flow and there's no other mechanism for
  //   continuing the flow if the stream consumer has just subscribed to the
  //   'data' event.
  //
  // In addition to the above conditions to keep reading data, the following
  // conditions prevent the data from being read:
  // - The stream has ended (state.ended).
  // - There is already a pending 'read' operation (state.reading). This is a
  //   case where the the stream has called the implementation defined _read()
  //   method, but they are processing the call asynchronously and have _not_
  //   called push() with new data. In this case we skip performing more
  //   read()s. The execution ends in this method again after the _read() ends
  //   up calling push() with more data.
  while (!state.reading && !state.ended && (state.length < state.highWaterMark || state.flowing && state.length === 0)) {
    var len = state.length;
    debug('maybeReadMore read 0');
    stream.read(0);
    if (len === state.length) // didn't get any data, stop spinning.
      break;
  }

  state.readingMore = false;
} // abstract method.  to be overridden in specific implementation classes.
// call cb(er, data) where data is <= n in length.
// for virtual (non-string, non-buffer) streams, "length" is somewhat
// arbitrary, and perhaps not very meaningful.


Readable.prototype._read = function (n) {
  errorOrDestroy(this, new ERR_METHOD_NOT_IMPLEMENTED$1('_read()'));
};

Readable.prototype.pipe = function (dest, pipeOpts) {
  var src = this;
  var state = this._readableState;

  switch (state.pipesCount) {
    case 0:
      state.pipes = dest;
      break;

    case 1:
      state.pipes = [state.pipes, dest];
      break;

    default:
      state.pipes.push(dest);
      break;
  }

  state.pipesCount += 1;
  debug('pipe count=%d opts=%j', state.pipesCount, pipeOpts);
  var doEnd = (!pipeOpts || pipeOpts.end !== false) && dest !== process.stdout && dest !== process.stderr;
  var endFn = doEnd ? onend : unpipe;
  if (state.endEmitted) process.nextTick(endFn);else src.once('end', endFn);
  dest.on('unpipe', onunpipe);

  function onunpipe(readable, unpipeInfo) {
    debug('onunpipe');

    if (readable === src) {
      if (unpipeInfo && unpipeInfo.hasUnpiped === false) {
        unpipeInfo.hasUnpiped = true;
        cleanup();
      }
    }
  }

  function onend() {
    debug('onend');
    dest.end();
  } // when the dest drains, it reduces the awaitDrain counter
  // on the source.  This would be more elegant with a .once()
  // handler in flow(), but adding and removing repeatedly is
  // too slow.


  var ondrain = pipeOnDrain(src);
  dest.on('drain', ondrain);
  var cleanedUp = false;

  function cleanup() {
    debug('cleanup'); // cleanup event handlers once the pipe is broken

    dest.removeListener('close', onclose);
    dest.removeListener('finish', onfinish);
    dest.removeListener('drain', ondrain);
    dest.removeListener('error', onerror);
    dest.removeListener('unpipe', onunpipe);
    src.removeListener('end', onend);
    src.removeListener('end', unpipe);
    src.removeListener('data', ondata);
    cleanedUp = true; // if the reader is waiting for a drain event from this
    // specific writer, then it would cause it to never start
    // flowing again.
    // So, if this is awaiting a drain, then we just call it now.
    // If we don't know, then assume that we are waiting for one.

    if (state.awaitDrain && (!dest._writableState || dest._writableState.needDrain)) ondrain();
  }

  src.on('data', ondata);

  function ondata(chunk) {
    debug('ondata');
    var ret = dest.write(chunk);
    debug('dest.write', ret);

    if (ret === false) {
      // If the user unpiped during `dest.write()`, it is possible
      // to get stuck in a permanently paused state if that write
      // also returned false.
      // => Check whether `dest` is still a piping destination.
      if ((state.pipesCount === 1 && state.pipes === dest || state.pipesCount > 1 && indexOf(state.pipes, dest) !== -1) && !cleanedUp) {
        debug('false write response, pause', state.awaitDrain);
        state.awaitDrain++;
      }

      src.pause();
    }
  } // if the dest has an error, then stop piping into it.
  // however, don't suppress the throwing behavior for this.


  function onerror(er) {
    debug('onerror', er);
    unpipe();
    dest.removeListener('error', onerror);
    if (EElistenerCount(dest, 'error') === 0) errorOrDestroy(dest, er);
  } // Make sure our error handler is attached before userland ones.


  prependListener(dest, 'error', onerror); // Both close and finish should trigger unpipe, but only once.

  function onclose() {
    dest.removeListener('finish', onfinish);
    unpipe();
  }

  dest.once('close', onclose);

  function onfinish() {
    debug('onfinish');
    dest.removeListener('close', onclose);
    unpipe();
  }

  dest.once('finish', onfinish);

  function unpipe() {
    debug('unpipe');
    src.unpipe(dest);
  } // tell the dest that it's being piped to


  dest.emit('pipe', src); // start the flow if it hasn't been started already.

  if (!state.flowing) {
    debug('pipe resume');
    src.resume();
  }

  return dest;
};

function pipeOnDrain(src) {
  return function pipeOnDrainFunctionResult() {
    var state = src._readableState;
    debug('pipeOnDrain', state.awaitDrain);
    if (state.awaitDrain) state.awaitDrain--;

    if (state.awaitDrain === 0 && EElistenerCount(src, 'data')) {
      state.flowing = true;
      flow(src);
    }
  };
}

Readable.prototype.unpipe = function (dest) {
  var state = this._readableState;
  var unpipeInfo = {
    hasUnpiped: false
  }; // if we're not piping anywhere, then do nothing.

  if (state.pipesCount === 0) return this; // just one destination.  most common case.

  if (state.pipesCount === 1) {
    // passed in one, but it's not the right one.
    if (dest && dest !== state.pipes) return this;
    if (!dest) dest = state.pipes; // got a match.

    state.pipes = null;
    state.pipesCount = 0;
    state.flowing = false;
    if (dest) dest.emit('unpipe', this, unpipeInfo);
    return this;
  } // slow case. multiple pipe destinations.


  if (!dest) {
    // remove all.
    var dests = state.pipes;
    var len = state.pipesCount;
    state.pipes = null;
    state.pipesCount = 0;
    state.flowing = false;

    for (var i = 0; i < len; i++) {
      dests[i].emit('unpipe', this, {
        hasUnpiped: false
      });
    }

    return this;
  } // try to find the right one.


  var index = indexOf(state.pipes, dest);
  if (index === -1) return this;
  state.pipes.splice(index, 1);
  state.pipesCount -= 1;
  if (state.pipesCount === 1) state.pipes = state.pipes[0];
  dest.emit('unpipe', this, unpipeInfo);
  return this;
}; // set up data events if they are asked for
// Ensure readable listeners eventually get something


Readable.prototype.on = function (ev, fn) {
  var res = streamBrowser.prototype.on.call(this, ev, fn);
  var state = this._readableState;

  if (ev === 'data') {
    // update readableListening so that resume() may be a no-op
    // a few lines down. This is needed to support once('readable').
    state.readableListening = this.listenerCount('readable') > 0; // Try start flowing on next tick if stream isn't explicitly paused

    if (state.flowing !== false) this.resume();
  } else if (ev === 'readable') {
    if (!state.endEmitted && !state.readableListening) {
      state.readableListening = state.needReadable = true;
      state.flowing = false;
      state.emittedReadable = false;
      debug('on readable', state.length, state.reading);

      if (state.length) {
        emitReadable(this);
      } else if (!state.reading) {
        process.nextTick(nReadingNextTick, this);
      }
    }
  }

  return res;
};

Readable.prototype.addListener = Readable.prototype.on;

Readable.prototype.removeListener = function (ev, fn) {
  var res = streamBrowser.prototype.removeListener.call(this, ev, fn);

  if (ev === 'readable') {
    // We need to check if there is someone still listening to
    // readable and reset the state. However this needs to happen
    // after readable has been emitted but before I/O (nextTick) to
    // support once('readable', fn) cycles. This means that calling
    // resume within the same tick will have no
    // effect.
    process.nextTick(updateReadableListening, this);
  }

  return res;
};

Readable.prototype.removeAllListeners = function (ev) {
  var res = streamBrowser.prototype.removeAllListeners.apply(this, arguments);

  if (ev === 'readable' || ev === undefined) {
    // We need to check if there is someone still listening to
    // readable and reset the state. However this needs to happen
    // after readable has been emitted but before I/O (nextTick) to
    // support once('readable', fn) cycles. This means that calling
    // resume within the same tick will have no
    // effect.
    process.nextTick(updateReadableListening, this);
  }

  return res;
};

function updateReadableListening(self) {
  var state = self._readableState;
  state.readableListening = self.listenerCount('readable') > 0;

  if (state.resumeScheduled && !state.paused) {
    // flowing needs to be set to true now, otherwise
    // the upcoming resume will not flow.
    state.flowing = true; // crude way to check if we should resume
  } else if (self.listenerCount('data') > 0) {
    self.resume();
  }
}

function nReadingNextTick(self) {
  debug('readable nexttick read 0');
  self.read(0);
} // pause() and resume() are remnants of the legacy readable stream API
// If the user uses them, then switch into old mode.


Readable.prototype.resume = function () {
  var state = this._readableState;

  if (!state.flowing) {
    debug('resume'); // we flow only if there is no one listening
    // for readable, but we still have to call
    // resume()

    state.flowing = !state.readableListening;
    resume(this, state);
  }

  state.paused = false;
  return this;
};

function resume(stream, state) {
  if (!state.resumeScheduled) {
    state.resumeScheduled = true;
    process.nextTick(resume_, stream, state);
  }
}

function resume_(stream, state) {
  debug('resume', state.reading);

  if (!state.reading) {
    stream.read(0);
  }

  state.resumeScheduled = false;
  stream.emit('resume');
  flow(stream);
  if (state.flowing && !state.reading) stream.read(0);
}

Readable.prototype.pause = function () {
  debug('call pause flowing=%j', this._readableState.flowing);

  if (this._readableState.flowing !== false) {
    debug('pause');
    this._readableState.flowing = false;
    this.emit('pause');
  }

  this._readableState.paused = true;
  return this;
};

function flow(stream) {
  var state = stream._readableState;
  debug('flow', state.flowing);

  while (state.flowing && stream.read() !== null) {
  }
} // wrap an old-style stream as the async data source.
// This is *not* part of the readable stream interface.
// It is an ugly unfortunate mess of history.


Readable.prototype.wrap = function (stream) {
  var _this = this;

  var state = this._readableState;
  var paused = false;
  stream.on('end', function () {
    debug('wrapped end');

    if (state.decoder && !state.ended) {
      var chunk = state.decoder.end();
      if (chunk && chunk.length) _this.push(chunk);
    }

    _this.push(null);
  });
  stream.on('data', function (chunk) {
    debug('wrapped data');
    if (state.decoder) chunk = state.decoder.write(chunk); // don't skip over falsy values in objectMode

    if (state.objectMode && (chunk === null || chunk === undefined)) return;else if (!state.objectMode && (!chunk || !chunk.length)) return;

    var ret = _this.push(chunk);

    if (!ret) {
      paused = true;
      stream.pause();
    }
  }); // proxy all the other methods.
  // important when wrapping filters and duplexes.

  for (var i in stream) {
    if (this[i] === undefined && typeof stream[i] === 'function') {
      this[i] = function methodWrap(method) {
        return function methodWrapReturnFunction() {
          return stream[method].apply(stream, arguments);
        };
      }(i);
    }
  } // proxy certain important events.


  for (var n = 0; n < kProxyEvents.length; n++) {
    stream.on(kProxyEvents[n], this.emit.bind(this, kProxyEvents[n]));
  } // when we try to consume some more bytes, simply unpause the
  // underlying stream.


  this._read = function (n) {
    debug('wrapped _read', n);

    if (paused) {
      paused = false;
      stream.resume();
    }
  };

  return this;
};

if (typeof Symbol === 'function') {
  Readable.prototype[Symbol.asyncIterator] = function () {
    if (createReadableStreamAsyncIterator === undefined) {
      createReadableStreamAsyncIterator = async_iterator;
    }

    return createReadableStreamAsyncIterator(this);
  };
}

Object.defineProperty(Readable.prototype, 'readableHighWaterMark', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._readableState.highWaterMark;
  }
});
Object.defineProperty(Readable.prototype, 'readableBuffer', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._readableState && this._readableState.buffer;
  }
});
Object.defineProperty(Readable.prototype, 'readableFlowing', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._readableState.flowing;
  },
  set: function set(state) {
    if (this._readableState) {
      this._readableState.flowing = state;
    }
  }
}); // exposed for testing purposes only.

Readable._fromList = fromList;
Object.defineProperty(Readable.prototype, 'readableLength', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._readableState.length;
  }
}); // Pluck off n bytes from an array of buffers.
// Length is the combined lengths of all the buffers in the list.
// This function is designed to be inlinable, so please take care when making
// changes to the function body.

function fromList(n, state) {
  // nothing buffered
  if (state.length === 0) return null;
  var ret;
  if (state.objectMode) ret = state.buffer.shift();else if (!n || n >= state.length) {
    // read it all, truncate the list
    if (state.decoder) ret = state.buffer.join('');else if (state.buffer.length === 1) ret = state.buffer.first();else ret = state.buffer.concat(state.length);
    state.buffer.clear();
  } else {
    // read part of list
    ret = state.buffer.consume(n, state.decoder);
  }
  return ret;
}

function endReadable(stream) {
  var state = stream._readableState;
  debug('endReadable', state.endEmitted);

  if (!state.endEmitted) {
    state.ended = true;
    process.nextTick(endReadableNT, state, stream);
  }
}

function endReadableNT(state, stream) {
  debug('endReadableNT', state.endEmitted, state.length); // Check that we didn't get one last unshift.

  if (!state.endEmitted && state.length === 0) {
    state.endEmitted = true;
    stream.readable = false;
    stream.emit('end');

    if (state.autoDestroy) {
      // In case of duplex streams we need a way to detect
      // if the writable side is ready for autoDestroy as well
      var wState = stream._writableState;

      if (!wState || wState.autoDestroy && wState.finished) {
        stream.destroy();
      }
    }
  }
}

if (typeof Symbol === 'function') {
  Readable.from = function (iterable, opts) {
    if (from === undefined) {
      from = fromBrowser;
    }

    return from(Readable, iterable, opts);
  };
}

function indexOf(xs, x) {
  for (var i = 0, l = xs.length; i < l; i++) {
    if (xs[i] === x) return i;
  }

  return -1;
}

var _stream_transform = Transform;

var _require$codes$1 = errorsBrowser.codes,
    ERR_METHOD_NOT_IMPLEMENTED = _require$codes$1.ERR_METHOD_NOT_IMPLEMENTED,
    ERR_MULTIPLE_CALLBACK = _require$codes$1.ERR_MULTIPLE_CALLBACK,
    ERR_TRANSFORM_ALREADY_TRANSFORMING = _require$codes$1.ERR_TRANSFORM_ALREADY_TRANSFORMING,
    ERR_TRANSFORM_WITH_LENGTH_0 = _require$codes$1.ERR_TRANSFORM_WITH_LENGTH_0;



inherits_browser(Transform, require$$2);

function afterTransform(er, data) {
  var ts = this._transformState;
  ts.transforming = false;
  var cb = ts.writecb;

  if (cb === null) {
    return this.emit('error', new ERR_MULTIPLE_CALLBACK());
  }

  ts.writechunk = null;
  ts.writecb = null;
  if (data != null) // single equals check for both `null` and `undefined`
    this.push(data);
  cb(er);
  var rs = this._readableState;
  rs.reading = false;

  if (rs.needReadable || rs.length < rs.highWaterMark) {
    this._read(rs.highWaterMark);
  }
}

function Transform(options) {
  if (!(this instanceof Transform)) return new Transform(options);
  require$$2.call(this, options);
  this._transformState = {
    afterTransform: afterTransform.bind(this),
    needTransform: false,
    transforming: false,
    writecb: null,
    writechunk: null,
    writeencoding: null
  }; // start out asking for a readable event once data is transformed.

  this._readableState.needReadable = true; // we have implemented the _read method, and done the other things
  // that Readable wants before the first _read call, so unset the
  // sync guard flag.

  this._readableState.sync = false;

  if (options) {
    if (typeof options.transform === 'function') this._transform = options.transform;
    if (typeof options.flush === 'function') this._flush = options.flush;
  } // When the writable side finishes, then flush out anything remaining.


  this.on('prefinish', prefinish);
}

function prefinish() {
  var _this = this;

  if (typeof this._flush === 'function' && !this._readableState.destroyed) {
    this._flush(function (er, data) {
      done(_this, er, data);
    });
  } else {
    done(this, null, null);
  }
}

Transform.prototype.push = function (chunk, encoding) {
  this._transformState.needTransform = false;
  return require$$2.prototype.push.call(this, chunk, encoding);
}; // This is the part where you do stuff!
// override this function in implementation classes.
// 'chunk' is an input chunk.
//
// Call `push(newChunk)` to pass along transformed output
// to the readable side.  You may call 'push' zero or more times.
//
// Call `cb(err)` when you are done with this chunk.  If you pass
// an error, then that'll put the hurt on the whole operation.  If you
// never call cb(), then you'll never get another chunk.


Transform.prototype._transform = function (chunk, encoding, cb) {
  cb(new ERR_METHOD_NOT_IMPLEMENTED('_transform()'));
};

Transform.prototype._write = function (chunk, encoding, cb) {
  var ts = this._transformState;
  ts.writecb = cb;
  ts.writechunk = chunk;
  ts.writeencoding = encoding;

  if (!ts.transforming) {
    var rs = this._readableState;
    if (ts.needTransform || rs.needReadable || rs.length < rs.highWaterMark) this._read(rs.highWaterMark);
  }
}; // Doesn't matter what the args are here.
// _transform does all the work.
// That we got here means that the readable side wants more data.


Transform.prototype._read = function (n) {
  var ts = this._transformState;

  if (ts.writechunk !== null && !ts.transforming) {
    ts.transforming = true;

    this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
  } else {
    // mark that we need a transform, so that any data that comes in
    // will get processed, now that we've asked for it.
    ts.needTransform = true;
  }
};

Transform.prototype._destroy = function (err, cb) {
  require$$2.prototype._destroy.call(this, err, function (err2) {
    cb(err2);
  });
};

function done(stream, er, data) {
  if (er) return stream.emit('error', er);
  if (data != null) // single equals check for both `null` and `undefined`
    stream.push(data); // TODO(BridgeAR): Write a test for these two error cases
  // if there's nothing in the write buffer, then that means
  // that nothing more will ever be provided

  if (stream._writableState.length) throw new ERR_TRANSFORM_WITH_LENGTH_0();
  if (stream._transformState.transforming) throw new ERR_TRANSFORM_ALREADY_TRANSFORMING();
  return stream.push(null);
}

var _stream_passthrough = PassThrough;



inherits_browser(PassThrough, _stream_transform);

function PassThrough(options) {
  if (!(this instanceof PassThrough)) return new PassThrough(options);
  _stream_transform.call(this, options);
}

PassThrough.prototype._transform = function (chunk, encoding, cb) {
  cb(null, chunk);
};

var eos;

function once(callback) {
  var called = false;
  return function () {
    if (called) return;
    called = true;
    callback.apply(void 0, arguments);
  };
}

var _require$codes = errorsBrowser.codes,
    ERR_MISSING_ARGS = _require$codes.ERR_MISSING_ARGS,
    ERR_STREAM_DESTROYED = _require$codes.ERR_STREAM_DESTROYED;

function noop(err) {
  // Rethrow the error if it exists to avoid swallowing it
  if (err) throw err;
}

function isRequest(stream) {
  return stream.setHeader && typeof stream.abort === 'function';
}

function destroyer(stream, reading, writing, callback) {
  callback = once(callback);
  var closed = false;
  stream.on('close', function () {
    closed = true;
  });
  if (eos === undefined) eos = endOfStream;
  eos(stream, {
    readable: reading,
    writable: writing
  }, function (err) {
    if (err) return callback(err);
    closed = true;
    callback();
  });
  var destroyed = false;
  return function (err) {
    if (closed) return;
    if (destroyed) return;
    destroyed = true; // request.destroy just do .end - .abort is what we want

    if (isRequest(stream)) return stream.abort();
    if (typeof stream.destroy === 'function') return stream.destroy();
    callback(err || new ERR_STREAM_DESTROYED('pipe'));
  };
}

function call(fn) {
  fn();
}

function pipe(from, to) {
  return from.pipe(to);
}

function popCallback(streams) {
  if (!streams.length) return noop;
  if (typeof streams[streams.length - 1] !== 'function') return noop;
  return streams.pop();
}

function pipeline() {
  for (var _len = arguments.length, streams = new Array(_len), _key = 0; _key < _len; _key++) {
    streams[_key] = arguments[_key];
  }

  var callback = popCallback(streams);
  if (Array.isArray(streams[0])) streams = streams[0];

  if (streams.length < 2) {
    throw new ERR_MISSING_ARGS('streams');
  }

  var error;
  var destroys = streams.map(function (stream, i) {
    var reading = i < streams.length - 1;
    var writing = i > 0;
    return destroyer(stream, reading, writing, function (err) {
      if (!error) error = err;
      if (err) destroys.forEach(call);
      if (reading) return;
      destroys.forEach(call);
      callback(error);
    });
  });
  return streams.reduce(pipe);
}

var pipeline_1 = pipeline;

var readableBrowser = createCommonjsModule(function (module, exports) {
exports = module.exports = require$$0;
exports.Stream = exports;
exports.Readable = exports;
exports.Writable = _stream_writable;
exports.Duplex = require$$2;
exports.Transform = _stream_transform;
exports.PassThrough = _stream_passthrough;
exports.finished = endOfStream;
exports.pipeline = pipeline_1;
});

const SSA_TYPES = new Set(['ssa', 'ass']);
const SSA_KEYS = ['readOrder', 'layer', 'style', 'name', 'marginL', 'marginR', 'marginV', 'effect', 'text'];

function getData(chunk, id) {
  const el = chunk.Children.find(c => c.id === id);
  return el ? el.data : undefined;
}

class SubtitleParserBase extends readableBrowser.Transform {
  constructor() {
    super();
    this.subtitleTracks = new Map();
    this.timecodeScale = 1;
    this._currentClusterTimecode = null;
    this.decoder = new EbmlStreamDecoder({
      bufferTagIds: [EbmlTagId.TimecodeScale, EbmlTagId.Tracks, EbmlTagId.BlockGroup, EbmlTagId.AttachedFile]
    });
    this.decoder.on('data', this.parseEbmlSubtitles.bind(this));
  }

  parseEbmlSubtitles(chunk) {
    // Segment Information
    if (chunk.id === EbmlTagId.TimecodeScale) {
      this.timecodeScale = chunk.data / 1000000;
    } // Assumption: This is a Cluster `Timecode`


    if (chunk.id === EbmlTagId.Timecode) {
      this._currentClusterTimecode = chunk.data;
    }

    if (chunk.id === EbmlTagId.Tracks) {
      for (const entry of chunk.Children.filter(c => c.id === EbmlTagId.TrackEntry)) {
        // Skip non subtitle tracks
        if (getData(entry, EbmlTagId.TrackType) !== 0x11) continue;
        const codecID = getData(entry, EbmlTagId.CodecID) || '';

        if (codecID.startsWith('S_TEXT')) {
          const track = {
            number: getData(entry, EbmlTagId.TrackNumber),
            language: getData(entry, EbmlTagId.Language),
            type: codecID.substring(7).toLowerCase()
          };
          const name = getData(entry, EbmlTagId.Name);

          if (name) {
            track.name = name;
          }

          const header = getData(entry, EbmlTagId.CodecPrivate);

          if (header) {
            track.header = header.toString();
          } // TODO: Assume zlib deflate compression


          const compressed = entry.Children.find(c => c.id === EbmlTagId.ContentEncodings && c.Children.find(cc => cc.id === EbmlTagId.ContentEncoding && cc.Children.find(ccc => ccc.id === EbmlTagId.ContentCompression)));

          if (compressed) {
            track._compressed = true;
          }

          this.subtitleTracks.set(track.number, track);
        }
      }

      this.emit('tracks', Array.from(this.subtitleTracks.values()));
    }

    if (chunk.id === EbmlTagId.BlockGroup) {
      const block = chunk.Children.find(c => c.id === EbmlTagId.Block);

      if (block && this.subtitleTracks.has(block.track)) {
        const blockDuration = getData(chunk, EbmlTagId.BlockDuration);
        const track = this.subtitleTracks.get(block.track);
        const payload = track._compressed ? inflateSync(Buffer$4.from(block.payload)) : block.payload;
        const subtitle = {
          text: payload.toString('utf8'),
          time: (block.value + this._currentClusterTimecode) * this.timecodeScale,
          duration: blockDuration * this.timecodeScale
        };

        if (SSA_TYPES.has(track.type)) {
          // extract SSA/ASS keys
          const values = subtitle.text.split(','); // ignore read-order, and skip layer if ssa

          for (let i = track.type === 'ssa' ? 2 : 1; i < 8; i++) {
            subtitle[SSA_KEYS[i]] = values[i];
          }

          subtitle.text = values.slice(8).join(',');
        }

        this.emit('subtitle', subtitle, block.track);
      }
    } // Parse attached files, mainly to allow extracting subtitle font files.


    if (chunk.id === EbmlTagId.AttachedFile) {
      this.emit('file', {
        filename: getData(chunk, EbmlTagId.FileName),
        mimetype: getData(chunk, EbmlTagId.FileMimeType),
        data: getData(chunk, EbmlTagId.FileData)
      });
    }
  }

}

class SubtitleParser extends SubtitleParserBase {
  constructor() {
    super();
    this.decoder.on('data', chunk => {
      if (chunk.id === EbmlTagId.Tracks) {
        // stop decoding if no subtitle tracks are present
        if (this.subtitleTracks.size === 0) this.end();
      }
    });
  }

  _write(chunk, _, callback) {
    this.decoder.write(chunk);
    callback(null, chunk);
  }

}

if (!ReadableStream.prototype[Symbol.asyncIterator]) {
  ReadableStream.prototype[Symbol.asyncIterator] = async function * () {
    const reader = this.getReader();
    while (1) {
      const chunk = await reader.read();
      if (chunk.done) return chunk.value
      yield chunk.value;
    }
  };
}

/* src\modules\Player.svelte generated by Svelte v3.42.5 */

const { console: console_1 } = globals;
const file$1 = "src\\modules\\Player.svelte";

function create_fragment$1(ctx) {
	let div;

	const block = {
		c: function create() {
			div = element("div");
			add_location(div, file$1, 20, 0, 529);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			insert_dev(target, div, anchor);
		},
		p: noop$4,
		i: noop$4,
		o: noop$4,
		d: function destroy(detaching) {
			if (detaching) detach_dev(div);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment$1.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function instance$1($$self, $$props, $$invalidate) {
	let { $$slots: slots = {}, $$scope } = $$props;
	validate_slots('Player', slots, []);
	let { files = [] } = $$props;

	async function testVideo(files) {
		if (files && files.length) {
			const parser = new SubtitleParser();
			parser.once('tracks', console.log);
			parser.on('subtitle', console.log);
			const stream = streamx.Readable.from(files[0].stream());
			stream.pipe(parser);
			stream.pause();
			console.log(stream);
		}
	}

	const writable_props = ['files'];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<Player> was created with unknown prop '${key}'`);
	});

	$$self.$$set = $$props => {
		if ('files' in $$props) $$invalidate(0, files = $$props.files);
	};

	$$self.$capture_state = () => ({
		Readable: streamx.Readable,
		SubtitleParser,
		files,
		testVideo
	});

	$$self.$inject_state = $$props => {
		if ('files' in $$props) $$invalidate(0, files = $$props.files);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*files*/ 1) {
			testVideo(files);
		}
	};

	return [files];
}

class Player extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init$1(this, options, instance$1, create_fragment$1, safe_not_equal, { files: 0 });

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "Player",
			options,
			id: create_fragment$1.name
		});
	}

	get files() {
		throw new Error("<Player>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set files(value) {
		throw new Error("<Player>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}
}

/* src\App.svelte generated by Svelte v3.42.5 */

const { document: document_1, window: window_1 } = globals;
const file = "src\\App.svelte";

function create_fragment(ctx) {
	let div;
	let player;
	let updating_files;
	let t;
	let title_value;
	let current;
	let mounted;
	let dispose;

	function player_files_binding(value) {
		/*player_files_binding*/ ctx[8](value);
	}

	let player_props = {};

	if (/*files*/ ctx[0] !== void 0) {
		player_props.files = /*files*/ ctx[0];
	}

	player = new Player({ props: player_props, $$inline: true });
	binding_callbacks.push(() => bind(player, 'files', player_files_binding));
	document_1.title = title_value = /*name*/ ctx[1] || 'Video Player';

	const block = {
		c: function create() {
			div = element("div");
			create_component(player.$$.fragment);
			t = space();
			attr_dev(div, "class", "page-wrapper with-navbar-fixed-bottom svelte-9sfuxi");
			add_location(div, file, 95, 0, 2996);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			insert_dev(target, div, anchor);
			mount_component(player, div, null);
			insert_dev(target, t, anchor);
			current = true;

			if (!mounted) {
				dispose = [
					listen_dev(window_1, "drop", prevent_default(/*handleDrop*/ ctx[2]), false, true, false),
					listen_dev(window_1, "dragenter", prevent_default(/*dragenter_handler*/ ctx[4]), false, true, false),
					listen_dev(window_1, "dragover", prevent_default(/*dragover_handler*/ ctx[5]), false, true, false),
					listen_dev(window_1, "dragstart", prevent_default(/*dragstart_handler*/ ctx[6]), false, true, false),
					listen_dev(window_1, "dragleave", prevent_default(/*dragleave_handler*/ ctx[7]), false, true, false),
					listen_dev(window_1, "paste", prevent_default(/*handlePaste*/ ctx[3]), false, true, false)
				];

				mounted = true;
			}
		},
		p: function update(ctx, [dirty]) {
			const player_changes = {};

			if (!updating_files && dirty & /*files*/ 1) {
				updating_files = true;
				player_changes.files = /*files*/ ctx[0];
				add_flush_callback(() => updating_files = false);
			}

			player.$set(player_changes);

			if ((!current || dirty & /*name*/ 2) && title_value !== (title_value = /*name*/ ctx[1] || 'Video Player')) {
				document_1.title = title_value;
			}
		},
		i: function intro(local) {
			if (current) return;
			transition_in(player.$$.fragment, local);
			current = true;
		},
		o: function outro(local) {
			transition_out(player.$$.fragment, local);
			current = false;
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(div);
			destroy_component(player);
			if (detaching) detach_dev(t);
			mounted = false;
			run_all(dispose);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

const videoRx = /\.(3gp|3gpp|3g2|ts|m2ts|mp4|m4p|mp4v|mpg4|qt|mov|omg|ogv|web|mkb|mk3d|mks)$/i;

function instance($$self, $$props, $$invalidate) {
	let { $$slots: slots = {}, $$scope } = $$props;
	validate_slots('App', slots, []);
	const DOMPARSER = new DOMParser().parseFromString.bind(new DOMParser());
	let name = '';
	let files;

	// loading files
	function handleDrop({ dataTransfer }) {
		handleItems([...dataTransfer.items]);
	}

	function handlePaste({ clipboardData }) {
		handleItems([...clipboardData.items]);
	}

	async function handleItems(items) {
		const promises = items.map(item => {
			if (item.type.indexOf('video/') === 0) {
				return item.getAsFile();
			}

			if (item.type === 'text/plain') {
				return new Promise(resolve => item.getAsString(url => {
						if (videoRx.test(url)) {
							const filename = url.substring(Math.max(url.lastIndexOf('\\'), url.lastIndexOf('/')) + 1);
							const name = filename.substring(0, filename.lastIndexOf('.')) || filename;
							resolve({ name, url, type: 'video/' });
						}

						resolve();
					}));
			}

			if (item.type === 'text/html') {
				return new Promise(resolve => item.getAsString(string => {
						const elems = DOMPARSER(string, 'text/html').querySelectorAll('video');
						if (elems.length) resolve(elems.map(video => video?.src));
						resolve();
					}));
			}

			if (!item.type) {
				let folder = item.webkitGetAsEntry();
				folder = folder.isDirectory && folder;

				if (folder) {
					return new Promise(resolve => {
							folder.createReader().readEntries(async entries => {
								const filePromises = entries.filter(entry => entry.isFile).map(file => new Promise(resolve => file.file(resolve)));
								resolve(await Promise.all(filePromises));
							});
						});
				}

				return;
			}

			return;
		});

		$$invalidate(0, files = (await Promise.all(promises)).flat().filter(i => i));
	}

	if ('launchQueue' in window) {
		launchQueue.setConsumer(async launchParams => {
			if (!launchParams.files.length) {
				return;
			}

			const promises = launchParams.files.map(file => file.getFile());

			// for some fucking reason, the same file can get passed multiple times, why? I still want to future-proof multi-files
			$$invalidate(0, files = (await Promise.all(promises)).filter((file, index, all) => {
				return all.findIndex(search => {
					return search.name === file.name && search.size === file.size && search.lastModified === file.lastModified;
				}) === index;
			}));
		});
	}

	function handlePopup() {
		if (!files.length) {
			let input = document.createElement('input');
			input.type = 'file';
			input.multiple = 'multiple';

			input.onchange = ({ target }) => {
				$$invalidate(0, files = [...target.files]);
				input = null;
			};

			input.click();
		}
	}

	const writable_props = [];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
	});

	function dragenter_handler(event) {
		bubble.call(this, $$self, event);
	}

	function dragover_handler(event) {
		bubble.call(this, $$self, event);
	}

	function dragstart_handler(event) {
		bubble.call(this, $$self, event);
	}

	function dragleave_handler(event) {
		bubble.call(this, $$self, event);
	}

	function player_files_binding(value) {
		files = value;
		$$invalidate(0, files);
	}

	$$self.$capture_state = () => ({
		Player,
		DOMPARSER,
		name,
		files,
		handleDrop,
		handlePaste,
		videoRx,
		handleItems,
		handlePopup
	});

	$$self.$inject_state = $$props => {
		if ('name' in $$props) $$invalidate(1, name = $$props.name);
		if ('files' in $$props) $$invalidate(0, files = $$props.files);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	return [
		files,
		name,
		handleDrop,
		handlePaste,
		dragenter_handler,
		dragover_handler,
		dragstart_handler,
		dragleave_handler,
		player_files_binding
	];
}

class App extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init$1(this, options, instance, create_fragment, safe_not_equal, {});

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "App",
			options,
			id: create_fragment.name
		});
	}
}

const app = new App({
  target: document.body
});

export { app as default };
//# sourceMappingURL=bundle.js.map
