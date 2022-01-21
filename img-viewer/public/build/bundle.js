
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
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
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
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
    function empty() {
        return text('');
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
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
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
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
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
        seen_callbacks.clear();
        set_current_component(saved_component);
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
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
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
            this.$destroy = noop;
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
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.46.2' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
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
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
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

    /* img-viewer\src\modules\InstallPrompt.svelte generated by Svelte v3.46.2 */

    const file$1 = "img-viewer\\src\\modules\\InstallPrompt.svelte";

    // (20:0) {#if deferredPrompt}
    function create_if_block$1(ctx) {
    	let div;
    	let h4;
    	let t1;
    	let button;
    	let span;
    	let t3;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			h4 = element("h4");
    			h4.textContent = "Install";
    			t1 = space();
    			button = element("button");
    			span = element("span");
    			span.textContent = "×";
    			t3 = text("\r\n    Click here to install the app for more features!");
    			attr_dev(h4, "class", "alert-heading");
    			add_location(h4, file$1, 21, 4, 515);
    			add_location(span, file$1, 22, 59, 614);
    			attr_dev(button, "class", "close");
    			attr_dev(button, "type", "button");
    			add_location(button, file$1, 22, 4, 559);
    			attr_dev(div, "class", "alert alert-success filled-dm show svelte-1qjuqpq");
    			add_location(div, file$1, 20, 2, 436);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h4);
    			append_dev(div, t1);
    			append_dev(div, button);
    			append_dev(button, span);
    			append_dev(div, t3);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button, "click", /*dismiss*/ ctx[2], false, false, false),
    					listen_dev(div, "click", /*promptInstall*/ ctx[1], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(20:0) {#if deferredPrompt}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let if_block_anchor;
    	let if_block = /*deferredPrompt*/ ctx[0] && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*deferredPrompt*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
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
    	validate_slots('InstallPrompt', slots, []);
    	let deferredPrompt;

    	window.addEventListener('beforeinstallprompt', e => {
    		e.preventDefault();
    		$$invalidate(0, deferredPrompt = e);
    	});

    	async function promptInstall() {
    		deferredPrompt.prompt();
    		const { outcome } = await deferredPrompt.userChoice;

    		if (outcome === 'accepted') {
    			$$invalidate(0, deferredPrompt = null);
    		}
    	}

    	function dismiss() {
    		$$invalidate(0, deferredPrompt = null);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<InstallPrompt> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ deferredPrompt, promptInstall, dismiss });

    	$$self.$inject_state = $$props => {
    		if ('deferredPrompt' in $$props) $$invalidate(0, deferredPrompt = $$props.deferredPrompt);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [deferredPrompt, promptInstall, dismiss];
    }

    class InstallPrompt extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "InstallPrompt",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* eslint-env browser */
    const videoExtensions = ['3g2', '3gp', 'asf', 'avi', 'dv', 'flv', 'gxf', 'm2ts', 'm4a', 'm4b', 'm4p', 'm4r', 'm4v', 'mkv', 'mov', 'mp4', 'mpd', 'mpeg', 'mpg', 'mxf', 'nut', 'ogm', 'ogv', 'swf', 'ts', 'vob', 'webm', 'wmv', 'wtv'];
    const videoRx = new RegExp(`.(${videoExtensions.join('|')})$`, 'i');

    const subtitleExtensions = ['srt', 'vtt', 'ass', 'ssa', 'sub', 'txt'];
    const subRx = new RegExp(`.(${subtitleExtensions.join('|')})$`, 'i');

    const audioExtensions = ['3gp', '3gpp', '3g2', 'aac', 'adts', 'ac3', 'amr', 'eac3', 'flac', 'mp3', 'm4a', 'mp4', 'mp4a', 'mpga', 'mp2', 'mp2a', 'mp3', 'm2a', 'm3a', 'oga', 'ogg', 'mogg', 'spx', 'opus', 'raw', 'wav', 'weba'];
    const audioRx = new RegExp(`.(${audioExtensions.join('|')})$`, 'i');

    const imageExtensions = ['apng', 'avif', 'bmp', 'gif', 'ico', 'jpg', 'jpeg', 'jfif', 'pjpeg', 'pjp', 'png', 'svg', 'tif', 'tiff', 'webp'];
    const imageRx = new RegExp(`.(${imageExtensions.join('|')})$`, 'i');

    const bookExtensions = ['epub', 'cbr', 'cba', 'cbt', 'cbz', 'cb7', 'zip'];
    const bookRx = new RegExp(`.(${bookExtensions.join('|')})$`, 'i');

    const DOMPARSER = new DOMParser().parseFromString.bind(new DOMParser());

    /* eslint-env browser */

    // types: image, audio, video, subtitle
    async function handleItems (transferList = [], types = []) {
      const items = await Promise.all([...transferList].map(item => processItem(item, types)));
      return items.flat().filter(i => i)
    }
    const rxMap = {
      audio: audioRx,
      video: videoRx,
      image: imageRx,
      subtitle: subRx,
      book: bookRx
    };
    const exMap = {
      audio: audioExtensions,
      video: videoExtensions,
      image: imageExtensions,
      subtitle: subtitleExtensions,
      book: bookExtensions
    };
    const selectorMap = {
      image: 'img',
      subtitle: 'input'
    };

    async function processItem (item, types) {
      if (!item) return null
      if (item.type) {
        // type matches File
        if (types.some(type => item.type.indexOf(type) === 0)) return item.getAsFile()
        // text
        if (item.type === 'text/plain') {
          // URL
          if (item.kind === 'string') {
            const string = await new Promise(resolve => item.getAsString(resolve));
            try {
              // URL might be invalid
              const url = new URL(string);
              const type = types.find(type => string.match(rxMap[type]));
              if (url && type) {
                return {
                  url: string,
                  name: string.substring(string.lastIndexOf('/') + 1),
                  type
                }
              }
            } catch (e) { }
            return null
          }
          // Text File
          if (item.kind === 'file') {
            const file = item.getAsFile();
            if (types.some(type => file.name.match(rxMap[type]))) return file
          }
          return null
        }
        // XML or clipboard
        if (item.type === 'text/html') {
          const string = await new Promise(resolve => item.getAsString(resolve));
          const elems = types.map(type => DOMPARSER(string, 'text/html').querySelectorAll(selectorMap[type] || type)).flat();
          if (!elems.length) return null
          return elems.map(elem => {
            const url = elem.src || elem.value;
            if (url) {
              return {
                url,
                name: url.substring(url.lastIndexOf('/') + 1)
              }
            }
            return null
          })
        }
      }
      // Folder or unknown file type
      const entry = item.webkitGetAsEntry();
      if (entry?.isDirectory) {
        const entries = await new Promise(resolve => entry.createReader().readEntries(resolve));
        const filePromises = entries.filter(entry => entry.isFile && types.some(type => entry.name.match(rxMap[type]))).map(file => new Promise(resolve => file.file(resolve)));
        return Promise.all(filePromises)
      }
      if (entry?.isFile) {
        if (types.some(type => entry.name.match(rxMap[type]))) {
          return new Promise(resolve => entry.file(resolve))
        }
      }
    }
    function filePopup (types = []) {
      return new Promise(resolve => {
        let input = document.createElement('input');
        input.type = 'file';
        input.multiple = 'multiple';
        input.accept = types.map(type => '.' + exMap[type].join(',.')).flat();

        input.onchange = async ({ target }) => {
          resolve([...target.files]);
          input = null;
        };
        input.click();
      })
    }

    function getSearchFiles (types) {
      const search = [...new URLSearchParams(location.search)];
      if (!search.length) return null
      const files = [];
      for (const param of search) {
        const type = types.find(type => param[1].match(rxMap[type]));
        if (type) {
          const name = param[1].substring(Math.max(param[1].lastIndexOf('\\') + 2, param[1].lastIndexOf('/') + 1));
          files.push({
            name,
            url: param[1]
          });
        }
      }
      return files
    }
    async function getLaunchFiles () {
      /* global launchQueue */
      return new Promise(resolve => {
        launchQueue.setConsumer(async launchParams => {
          if (!launchParams.files.length) {
            return
          }
          const promises = launchParams.files.map(file => file.getFile());
          // for some fucking reason, the same file can get passed multiple times, why? I still want to future-proof multi-files
          resolve((await Promise.all(promises)).filter((file, index, all) => {
            return all.findIndex(search => {
              return search.name === file.name && search.size === file.size && search.lastModified === file.lastModified
            }) === index
          }));
        });
      })
    }

    /* img-viewer\src\App.svelte generated by Svelte v3.46.2 */

    const { window: window_1 } = globals;

    const file = "img-viewer\\src\\App.svelte";

    // (204:2) {#if files.length > 1}
    function create_if_block(ctx) {
    	let div;
    	let button0;
    	let t1;
    	let button1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			button0 = element("button");
    			button0.textContent = "arrow_back";
    			t1 = space();
    			button1 = element("button");
    			button1.textContent = "arrow_forward";
    			attr_dev(button0, "class", "btn btn-lg btn-square material-icons");
    			attr_dev(button0, "type", "button");
    			add_location(button0, file, 205, 6, 5887);
    			attr_dev(button1, "class", "btn btn-lg btn-square material-icons");
    			attr_dev(button1, "type", "button");
    			add_location(button1, file, 206, 6, 6000);
    			attr_dev(div, "class", "btn-group bg-dark-dm bg-light-lm rounded m-5 col-auto");
    			add_location(div, file, 204, 4, 5813);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, button0);
    			append_dev(div, t1);
    			append_dev(div, button1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*viewLast*/ ctx[13], false, false, false),
    					listen_dev(button1, "click", /*viewNext*/ ctx[12], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(204:2) {#if files.length > 1}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div0;
    	let installprompt;
    	let t0;
    	let div1;
    	let img;
    	let img_src_value;
    	let t1;
    	let div5;
    	let t2;
    	let div2;
    	let button0;
    	let t4;
    	let button1;
    	let t6;
    	let input;
    	let input_value_value;
    	let t7;
    	let button2;
    	let t9;
    	let div4;
    	let button3;
    	let t10_value = (/*isBlurred*/ ctx[3] ? 'blur_off' : 'blur_on') + "";
    	let t10;
    	let t11;
    	let button4;
    	let t13;
    	let button5;
    	let t15;
    	let button6;
    	let div3;
    	let t17;
    	let button7;
    	let t19;
    	let title_value;
    	let current;
    	let mounted;
    	let dispose;
    	installprompt = new InstallPrompt({ $$inline: true });
    	let if_block = /*files*/ ctx[7].length > 1 && create_if_block(ctx);

    	document.title = title_value = "" + (/*name*/ ctx[4] + " " + (/*dimensions*/ ctx[6].x && /*dimensions*/ ctx[6].y
    	? `(${/*dimensions*/ ctx[6].x} x ${/*dimensions*/ ctx[6].y})`
    	: '') + " " + /*prettyBytes*/ ctx[9](/*fileSize*/ ctx[5]));

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			create_component(installprompt.$$.fragment);
    			t0 = space();
    			div1 = element("div");
    			img = element("img");
    			t1 = space();
    			div5 = element("div");
    			if (if_block) if_block.c();
    			t2 = space();
    			div2 = element("div");
    			button0 = element("button");
    			button0.textContent = "zoom_out_map";
    			t4 = space();
    			button1 = element("button");
    			button1.textContent = "remove";
    			t6 = space();
    			input = element("input");
    			t7 = space();
    			button2 = element("button");
    			button2.textContent = "add";
    			t9 = space();
    			div4 = element("div");
    			button3 = element("button");
    			t10 = text(t10_value);
    			t11 = space();
    			button4 = element("button");
    			button4.textContent = "rotate_left";
    			t13 = space();
    			button5 = element("button");
    			button5.textContent = "rotate_right";
    			t15 = space();
    			button6 = element("button");
    			div3 = element("div");
    			div3.textContent = "flip";
    			t17 = space();
    			button7 = element("button");
    			button7.textContent = "flip";
    			t19 = space();
    			attr_dev(div0, "class", "sticky-alerts d-flex flex-column-reverse svelte-1w5qlh3");
    			add_location(div0, file, 187, 0, 5230);
    			if (!src_url_equal(img.src, img_src_value = /*src*/ ctx[1])) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "view");
    			attr_dev(img, "class", "w-full h-full position-absolute svelte-1w5qlh3");
    			toggle_class(img, "transition", /*transition*/ ctx[8]);
    			add_location(img, file, 199, 2, 5580);
    			attr_dev(div1, "class", "w-full h-full overflow-hidden position-relative dragarea svelte-1w5qlh3");
    			add_location(div1, file, 190, 0, 5312);
    			attr_dev(button0, "class", "btn btn-lg btn-square material-icons svelte-1w5qlh3");
    			attr_dev(button0, "type", "button");
    			add_location(button0, file, 211, 4, 6222);
    			attr_dev(button1, "class", "btn btn-lg btn-square material-icons svelte-1w5qlh3");
    			attr_dev(button1, "type", "button");
    			add_location(button1, file, 212, 4, 6335);
    			attr_dev(input, "type", "number");
    			attr_dev(input, "step", "0.1");
    			attr_dev(input, "min", "0.1");
    			attr_dev(input, "class", "form-control form-control-lg text-right svelte-1w5qlh3");
    			attr_dev(input, "placeholder", "Scale");
    			input.readOnly = true;
    			input.value = input_value_value = /*zoom*/ ctx[0].toFixed(1);
    			add_location(input, file, 213, 4, 6467);
    			attr_dev(button2, "class", "btn btn-lg btn-square material-icons svelte-1w5qlh3");
    			attr_dev(button2, "type", "button");
    			add_location(button2, file, 214, 4, 6617);
    			attr_dev(div2, "class", "btn-group input-group bg-dark-dm bg-light-lm rounded m-5 w-200 col-auto svelte-1w5qlh3");
    			add_location(div2, file, 210, 2, 6132);
    			attr_dev(button3, "class", "btn btn-lg btn-square material-icons");
    			attr_dev(button3, "type", "button");
    			add_location(button3, file, 218, 4, 6827);
    			attr_dev(button4, "class", "btn btn-lg btn-square material-icons");
    			attr_dev(button4, "type", "button");
    			add_location(button4, file, 221, 4, 6978);
    			attr_dev(button5, "class", "btn btn-lg btn-square material-icons");
    			attr_dev(button5, "type", "button");
    			add_location(button5, file, 222, 4, 7089);
    			attr_dev(div3, "class", "flip svelte-1w5qlh3");
    			add_location(div3, file, 223, 93, 7290);
    			attr_dev(button6, "class", "btn btn-lg btn-square material-icons");
    			attr_dev(button6, "type", "button");
    			add_location(button6, file, 223, 4, 7201);
    			attr_dev(button7, "class", "btn btn-lg btn-square material-icons");
    			attr_dev(button7, "type", "button");
    			add_location(button7, file, 224, 4, 7332);
    			attr_dev(div4, "class", "btn-group bg-dark-dm bg-light-lm rounded m-5 col-auto");
    			add_location(div4, file, 217, 2, 6755);
    			attr_dev(div5, "class", "position-absolute buttons row w-full justify-content-center svelte-1w5qlh3");
    			add_location(div5, file, 202, 0, 5710);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			mount_component(installprompt, div0, null);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, img);
    			/*img_binding*/ ctx[35](img);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div5, anchor);
    			if (if_block) if_block.m(div5, null);
    			append_dev(div5, t2);
    			append_dev(div5, div2);
    			append_dev(div2, button0);
    			append_dev(div2, t4);
    			append_dev(div2, button1);
    			append_dev(div2, t6);
    			append_dev(div2, input);
    			append_dev(div2, t7);
    			append_dev(div2, button2);
    			append_dev(div5, t9);
    			append_dev(div5, div4);
    			append_dev(div4, button3);
    			append_dev(button3, t10);
    			append_dev(div4, t11);
    			append_dev(div4, button4);
    			append_dev(div4, t13);
    			append_dev(div4, button5);
    			append_dev(div4, t15);
    			append_dev(div4, button6);
    			append_dev(button6, div3);
    			append_dev(div4, t17);
    			append_dev(div4, button7);
    			insert_dev(target, t19, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(window_1, "drop", prevent_default(/*handleInput*/ ctx[17]), false, true, false),
    					listen_dev(window_1, "dragenter", prevent_default(/*dragenter_handler*/ ctx[31]), false, true, false),
    					listen_dev(window_1, "dragover", prevent_default(/*dragover_handler*/ ctx[32]), false, true, false),
    					listen_dev(window_1, "dragstart", prevent_default(/*dragstart_handler*/ ctx[33]), false, true, false),
    					listen_dev(window_1, "dragleave", prevent_default(/*dragleave_handler*/ ctx[34]), false, true, false),
    					listen_dev(window_1, "paste", prevent_default(/*handleInput*/ ctx[17]), false, true, false),
    					listen_dev(img, "load", /*handleImage*/ ctx[21], false, false, false),
    					listen_dev(div1, "pointerdown", /*dragStart*/ ctx[10], false, false, false),
    					listen_dev(div1, "pointerup", /*dragEnd*/ ctx[11], false, false, false),
    					listen_dev(div1, "wheel", /*handleZoom*/ ctx[16], { passive: true }, false, false),
    					listen_dev(div1, "touchend", /*dragEnd*/ ctx[11], false, false, false),
    					listen_dev(div1, "touchstart", /*checkPinch*/ ctx[14], false, false, false),
    					listen_dev(div1, "touchmove", /*handlePinch*/ ctx[15], false, false, false),
    					listen_dev(div1, "click", /*handlePopup*/ ctx[18], false, false, false),
    					listen_dev(button0, "click", /*resetPos*/ ctx[20], false, false, false),
    					listen_dev(button1, "click", /*click_handler*/ ctx[36], false, false, false),
    					listen_dev(button2, "click", /*click_handler_1*/ ctx[37], false, false, false),
    					listen_dev(button3, "click", /*toggleBlur*/ ctx[19], false, false, false),
    					listen_dev(button4, "click", /*rotateL*/ ctx[22], false, false, false),
    					listen_dev(button5, "click", /*rotateR*/ ctx[23], false, false, false),
    					listen_dev(button6, "click", /*toggleFlip*/ ctx[24], false, false, false),
    					listen_dev(button7, "click", /*toggleMirror*/ ctx[25], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (!current || dirty[0] & /*src*/ 2 && !src_url_equal(img.src, img_src_value = /*src*/ ctx[1])) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty[0] & /*transition*/ 256) {
    				toggle_class(img, "transition", /*transition*/ ctx[8]);
    			}

    			if (/*files*/ ctx[7].length > 1) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(div5, t2);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (!current || dirty[0] & /*zoom*/ 1 && input_value_value !== (input_value_value = /*zoom*/ ctx[0].toFixed(1)) && input.value !== input_value_value) {
    				prop_dev(input, "value", input_value_value);
    			}

    			if ((!current || dirty[0] & /*isBlurred*/ 8) && t10_value !== (t10_value = (/*isBlurred*/ ctx[3] ? 'blur_off' : 'blur_on') + "")) set_data_dev(t10, t10_value);

    			if ((!current || dirty[0] & /*name, dimensions, prettyBytes, fileSize*/ 624) && title_value !== (title_value = "" + (/*name*/ ctx[4] + " " + (/*dimensions*/ ctx[6].x && /*dimensions*/ ctx[6].y
    			? `(${/*dimensions*/ ctx[6].x} x ${/*dimensions*/ ctx[6].y})`
    			: '') + " " + /*prettyBytes*/ ctx[9](/*fileSize*/ ctx[5])))) {
    				document.title = title_value;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(installprompt.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(installprompt.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			destroy_component(installprompt);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div1);
    			/*img_binding*/ ctx[35](null);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div5);
    			if (if_block) if_block.d();
    			if (detaching) detach_dev(t19);
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

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let src = null;
    	let image = null;
    	let scale = 0;
    	let isBlurred = true;
    	let name = 'Image Viewer';
    	let fileSize = null;
    	const initial = { x: 0, y: 0 };
    	const old = { x: 0, y: 0 };
    	const position = { x: 0, y: 0 };
    	let disPos = initial;
    	const dimensions = { x: null, y: null };
    	const units = [' B', ' KB', ' MB', ' GB'];
    	let files = [];
    	let current = null;
    	navigator.serviceWorker.register('/sw.js');

    	function prettyBytes(num) {
    		if (isNaN(num) || num == null) return '';
    		if (num < 1) return num + ' B';
    		const exponent = Math.min(Math.floor(Math.log(num) / Math.log(1000)), units.length - 1);
    		return Number((num / Math.pow(1000, exponent)).toFixed(2)) + units[exponent];
    	}

    	function setSource(target) {
    		if (target) {
    			if (target.constructor === String) {
    				const startIndex = Math.max(target.lastIndexOf('\\'), target.lastIndexOf('/')) + 1;
    				$$invalidate(4, name = target.substring(startIndex));
    				$$invalidate(5, fileSize = null);
    				$$invalidate(1, src = target);
    			} else {
    				const startIndex = Math.max(target.name.lastIndexOf('\\'), target.name.lastIndexOf('/')) + 1;
    				$$invalidate(4, name = target.name.substring(startIndex));
    				$$invalidate(5, fileSize = target.size);
    				$$invalidate(1, src = target.url);
    			}
    		}
    	}

    	let transition = true;

    	// dragging around
    	function dragStart(e) {
    		$$invalidate(8, transition = false);
    		initial.x = e.clientX;
    		initial.y = e.clientY;
    		$$invalidate(2, image.onpointermove = handleDrag, image);
    		if (e.pointerId) image.setPointerCapture(e.pointerId);
    	}

    	function dragEnd(e) {
    		if (image.onpointermove) {
    			$$invalidate(8, transition = true);
    			$$invalidate(2, image.onpointermove = null, image);
    			if (e.pointerId) image.releasePointerCapture(e.pointerId);

    			if (pinching) {
    				pinching = false;
    				lasthypot = 0;
    			} else {
    				old.x += e.clientX - initial.x;
    				old.y += e.clientY - initial.y;
    			}
    		}
    	}

    	function handleDrag(e) {
    		if (!pinching) {
    			position.x = old.x + e.clientX - initial.x;
    			position.y = old.y + e.clientY - initial.y;
    			$$invalidate(26, disPos = position);
    		}
    	}

    	function viewNext() {
    		$$invalidate(27, current = files[(files.indexOf(current) + 1) % files.length]);
    	}

    	function viewLast() {
    		const index = files.indexOf(current);
    		$$invalidate(27, current = files[index === 0 ? files.length - 1 : index - 1]);
    	}

    	// zooming
    	let pinching = false;

    	function checkPinch({ touches }) {
    		if (touches.length === 2) {
    			pinching = true;
    			$$invalidate(8, transition = true);
    		}
    	}

    	let lasthypot = 0;
    	let hypotdelta = 0;

    	function handlePinch({ touches }) {
    		if (touches.length === 2 && pinching === true) {
    			const last = lasthypot;
    			lasthypot = Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY);
    			hypotdelta += last - lasthypot;

    			if (hypotdelta > 20 || hypotdelta < -20) {
    				handleZoom({ deltaY: hypotdelta > 0 ? 100 : -100 });
    				hypotdelta = 0;
    			}
    		}
    	}

    	let zoom = 1;

    	function handleZoom({ deltaY }) {
    		const diff = deltaY * -0.01;

    		if (diff < 0) {
    			if (!(scale < -4)) scale -= 0.5;
    			old.x /= 1.5;
    			old.y /= 1.5;
    		} else if (diff > 0 && !(scale > 11)) {
    			scale += 0.5;
    			old.x *= 1.5;
    			old.y *= 1.5;
    		}

    		$$invalidate(0, zoom = 2 ** scale);
    		$$invalidate(26, disPos = old);
    	}

    	// loading files
    	async function handleInput({ dataTransfer, clipboardData }) {
    		const items = clipboardData?.items || dataTransfer?.items;

    		if (items) {
    			handleFiles(await handleItems(items, ['image']));
    		}
    	}

    	if ('launchQueue' in window) {
    		getLaunchFiles().then(handleFiles);
    	}

    	async function handlePopup() {
    		if (!files.length) {
    			handleFiles(await filePopup(['image']));
    		}
    	}

    	function handleFiles(newfiles) {
    		if (newfiles?.length) {
    			for (const file of newfiles) {
    				// this is both bad and good, makes 2nd load instant, but uses extra ram
    				if (file instanceof File) file.url = URL.createObjectURL(file);
    			}

    			$$invalidate(7, files = files.concat(newfiles));
    			if (!current) $$invalidate(27, current = files[0]);
    		}
    	}

    	handleFiles(getSearchFiles(['image']));

    	// UI
    	function toggleBlur() {
    		$$invalidate(3, isBlurred = !isBlurred);
    		image.style.setProperty('--pixel', isBlurred ? 'crisp-edges' : 'pixelated');
    	}

    	function resetPos() {
    		old.x = 0;
    		old.y = 0;
    		scale = 0;
    		$$invalidate(0, zoom = 1);
    		$$invalidate(26, disPos = old);
    	}

    	function handleImage() {
    		$$invalidate(6, dimensions.x = image.naturalWidth, dimensions);
    		$$invalidate(6, dimensions.y = image.naturalHeight, dimensions);
    	}

    	let rotation = 0;

    	// this is bad, but %360 causes css animation bug :(
    	function rotateL() {
    		$$invalidate(28, rotation -= 90);
    	}

    	function rotateR() {
    		$$invalidate(28, rotation += 90);
    	}

    	let flip = false;

    	function toggleFlip() {
    		$$invalidate(29, flip = !flip);
    	}

    	let mirror = false;

    	function toggleMirror() {
    		$$invalidate(30, mirror = !mirror);
    	}

    	function handleStyle({ disPos, mirror, flip, rotation, zoom }) {
    		image?.style.setProperty('transform', `rotate(${rotation}deg) ` + `scaleX(${mirror ? -1 : 1}) ` + `scaleY(${flip ? -1 : 1}) ` + `scale(${zoom})`);
    		image?.style.setProperty('--left', disPos.x + 'px');
    		image?.style.setProperty('--top', disPos.y + 'px');
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

    	function img_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			image = $$value;
    			$$invalidate(2, image);
    		});
    	}

    	const click_handler = () => handleZoom({ deltaY: 100 });
    	const click_handler_1 = () => handleZoom({ deltaY: -100 });

    	$$self.$capture_state = () => ({
    		InstallPrompt,
    		filePopup,
    		handleItems,
    		getSearchFiles,
    		getLaunchFiles,
    		src,
    		image,
    		scale,
    		isBlurred,
    		name,
    		fileSize,
    		initial,
    		old,
    		position,
    		disPos,
    		dimensions,
    		units,
    		files,
    		current,
    		prettyBytes,
    		setSource,
    		transition,
    		dragStart,
    		dragEnd,
    		handleDrag,
    		viewNext,
    		viewLast,
    		pinching,
    		checkPinch,
    		lasthypot,
    		hypotdelta,
    		handlePinch,
    		zoom,
    		handleZoom,
    		handleInput,
    		handlePopup,
    		handleFiles,
    		toggleBlur,
    		resetPos,
    		handleImage,
    		rotation,
    		rotateL,
    		rotateR,
    		flip,
    		toggleFlip,
    		mirror,
    		toggleMirror,
    		handleStyle
    	});

    	$$self.$inject_state = $$props => {
    		if ('src' in $$props) $$invalidate(1, src = $$props.src);
    		if ('image' in $$props) $$invalidate(2, image = $$props.image);
    		if ('scale' in $$props) scale = $$props.scale;
    		if ('isBlurred' in $$props) $$invalidate(3, isBlurred = $$props.isBlurred);
    		if ('name' in $$props) $$invalidate(4, name = $$props.name);
    		if ('fileSize' in $$props) $$invalidate(5, fileSize = $$props.fileSize);
    		if ('disPos' in $$props) $$invalidate(26, disPos = $$props.disPos);
    		if ('files' in $$props) $$invalidate(7, files = $$props.files);
    		if ('current' in $$props) $$invalidate(27, current = $$props.current);
    		if ('transition' in $$props) $$invalidate(8, transition = $$props.transition);
    		if ('pinching' in $$props) pinching = $$props.pinching;
    		if ('lasthypot' in $$props) lasthypot = $$props.lasthypot;
    		if ('hypotdelta' in $$props) hypotdelta = $$props.hypotdelta;
    		if ('zoom' in $$props) $$invalidate(0, zoom = $$props.zoom);
    		if ('rotation' in $$props) $$invalidate(28, rotation = $$props.rotation);
    		if ('flip' in $$props) $$invalidate(29, flip = $$props.flip);
    		if ('mirror' in $$props) $$invalidate(30, mirror = $$props.mirror);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*current*/ 134217728) {
    			setSource(current);
    		}

    		if ($$self.$$.dirty[0] & /*disPos, mirror, flip, rotation, zoom*/ 1946157057) {
    			handleStyle({ disPos, mirror, flip, rotation, zoom });
    		}
    	};

    	return [
    		zoom,
    		src,
    		image,
    		isBlurred,
    		name,
    		fileSize,
    		dimensions,
    		files,
    		transition,
    		prettyBytes,
    		dragStart,
    		dragEnd,
    		viewNext,
    		viewLast,
    		checkPinch,
    		handlePinch,
    		handleZoom,
    		handleInput,
    		handlePopup,
    		toggleBlur,
    		resetPos,
    		handleImage,
    		rotateL,
    		rotateR,
    		toggleFlip,
    		toggleMirror,
    		disPos,
    		current,
    		rotation,
    		flip,
    		mirror,
    		dragenter_handler,
    		dragover_handler,
    		dragstart_handler,
    		dragleave_handler,
    		img_binding,
    		click_handler,
    		click_handler_1
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {}, null, [-1, -1]);

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

    return app;

})();
//# sourceMappingURL=bundle.js.map
