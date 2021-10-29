
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
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.44.0' }, detail), true));
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

    /* src\modules\InstallPrompt.svelte generated by Svelte v3.44.0 */

    const file$1 = "src\\modules\\InstallPrompt.svelte";

    // (20:0) {#if deferredPrompt}
    function create_if_block(ctx) {
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
    		id: create_if_block.name,
    		type: "if",
    		source: "(20:0) {#if deferredPrompt}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let if_block_anchor;
    	let if_block = /*deferredPrompt*/ ctx[0] && create_if_block(ctx);

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
    					if_block = create_if_block(ctx);
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

    /*
    * This is the list of possible WEBM file sections by their IDs.
    * Possible types: Container, Binary, Uint, Int, String, Float, Date
    */
    const sections = {
      0xa45dfa3: { name: 'EBML', type: 'Container' },
      0x286: { name: 'EBMLVersion', type: 'Uint' },
      0x2f7: { name: 'EBMLReadVersion', type: 'Uint' },
      0x2f2: { name: 'EBMLMaxIDLength', type: 'Uint' },
      0x2f3: { name: 'EBMLMaxSizeLength', type: 'Uint' },
      0x282: { name: 'DocType', type: 'String' },
      0x287: { name: 'DocTypeVersion', type: 'Uint' },
      0x285: { name: 'DocTypeReadVersion', type: 'Uint' },
      0x6c: { name: 'Void', type: 'Binary' },
      0x3f: { name: 'CRC-32', type: 'Binary' },
      0xb538667: { name: 'SignatureSlot', type: 'Container' },
      0x3e8a: { name: 'SignatureAlgo', type: 'Uint' },
      0x3e9a: { name: 'SignatureHash', type: 'Uint' },
      0x3ea5: { name: 'SignaturePublicKey', type: 'Binary' },
      0x3eb5: { name: 'Signature', type: 'Binary' },
      0x3e5b: { name: 'SignatureElements', type: 'Container' },
      0x3e7b: { name: 'SignatureElementList', type: 'Container' },
      0x2532: { name: 'SignedElement', type: 'Binary' },
      0x8538067: { name: 'Segment', type: 'Container' },
      0x14d9b74: { name: 'SeekHead', type: 'Container' },
      0xdbb: { name: 'Seek', type: 'Container' },
      0x13ab: { name: 'SeekID', type: 'Binary' },
      0x13ac: { name: 'SeekPosition', type: 'Uint' },
      0x549a966: { name: 'Info', type: 'Container' },
      0x33a4: { name: 'SegmentUID', type: 'Binary' },
      0x3384: { name: 'SegmentFilename', type: 'String' },
      0x1cb923: { name: 'PrevUID', type: 'Binary' },
      0x1c83ab: { name: 'PrevFilename', type: 'String' },
      0x1eb923: { name: 'NextUID', type: 'Binary' },
      0x1e83bb: { name: 'NextFilename', type: 'String' },
      0x444: { name: 'SegmentFamily', type: 'Binary' },
      0x2924: { name: 'ChapterTranslate', type: 'Container' },
      0x29fc: { name: 'ChapterTranslateEditionUID', type: 'Uint' },
      0x29bf: { name: 'ChapterTranslateCodec', type: 'Uint' },
      0x29a5: { name: 'ChapterTranslateID', type: 'Binary' },
      0xad7b1: { name: 'TimecodeScale', type: 'Uint' },
      0x489: { name: 'Duration', type: 'Float' },
      0x461: { name: 'DateUTC', type: 'Date' },
      0x3ba9: { name: 'Title', type: 'String' },
      0xd80: { name: 'MuxingApp', type: 'String' },
      0x1741: { name: 'WritingApp', type: 'String' },
      // 0xf43b675: { name: 'Cluster', type: 'Container' },
      0x67: { name: 'Timecode', type: 'Uint' },
      0x1854: { name: 'SilentTracks', type: 'Container' },
      0x18d7: { name: 'SilentTrackNumber', type: 'Uint' },
      0x27: { name: 'Position', type: 'Uint' },
      0x2b: { name: 'PrevSize', type: 'Uint' },
      0x23: { name: 'SimpleBlock', type: 'Binary' },
      0x20: { name: 'BlockGroup', type: 'Container' },
      0x21: { name: 'Block', type: 'Binary' },
      0x22: { name: 'BlockVirtual', type: 'Binary' },
      0x35a1: { name: 'BlockAdditions', type: 'Container' },
      0x26: { name: 'BlockMore', type: 'Container' },
      0x6e: { name: 'BlockAddID', type: 'Uint' },
      0x25: { name: 'BlockAdditional', type: 'Binary' },
      0x1b: { name: 'BlockDuration', type: 'Uint' },
      0x7a: { name: 'ReferencePriority', type: 'Uint' },
      0x7b: { name: 'ReferenceBlock', type: 'Int' },
      0x7d: { name: 'ReferenceVirtual', type: 'Int' },
      0x24: { name: 'CodecState', type: 'Binary' },
      0x35a2: { name: 'DiscardPadding', type: 'Int' },
      0xe: { name: 'Slices', type: 'Container' },
      0x68: { name: 'TimeSlice', type: 'Container' },
      0x4c: { name: 'LaceNumber', type: 'Uint' },
      0x4d: { name: 'FrameNumber', type: 'Uint' },
      0x4b: { name: 'BlockAdditionID', type: 'Uint' },
      0x4e: { name: 'Delay', type: 'Uint' },
      0x4f: { name: 'SliceDuration', type: 'Uint' },
      0x48: { name: 'ReferenceFrame', type: 'Container' },
      0x49: { name: 'ReferenceOffset', type: 'Uint' },
      0x4a: { name: 'ReferenceTimeCode', type: 'Uint' },
      0x2f: { name: 'EncryptedBlock', type: 'Binary' },
      0x654ae6b: { name: 'Tracks', type: 'Container' },
      0x2e: { name: 'TrackEntry', type: 'Container' },
      0x57: { name: 'TrackNumber', type: 'Uint' },
      0x33c5: { name: 'TrackUID', type: 'Uint' },
      0x3: { name: 'TrackType', type: 'Uint' },
      0x39: { name: 'FlagEnabled', type: 'Uint' },
      0x8: { name: 'FlagDefault', type: 'Uint' },
      0x15aa: { name: 'FlagForced', type: 'Uint' },
      0x1c: { name: 'FlagLacing', type: 'Uint' },
      0x2de7: { name: 'MinCache', type: 'Uint' },
      0x2df8: { name: 'MaxCache', type: 'Uint' },
      0x3e383: { name: 'DefaultDuration', type: 'Uint' },
      0x34e7a: { name: 'DefaultDecodedFieldDuration', type: 'Uint' },
      0x3314f: { name: 'TrackTimecodeScale', type: 'Float' },
      0x137f: { name: 'TrackOffset', type: 'Int' },
      0x15ee: { name: 'MaxBlockAdditionID', type: 'Uint' },
      0x136e: { name: 'Name', type: 'String' },
      0x2b59c: { name: 'Language', type: 'String' },
      0x6: { name: 'CodecID', type: 'String' },
      0x23a2: { name: 'CodecPrivate', type: 'Binary' },
      0x58688: { name: 'CodecName', type: 'String' },
      0x3446: { name: 'AttachmentLink', type: 'Uint' },
      0x1a9697: { name: 'CodecSettings', type: 'String' },
      0x1b4040: { name: 'CodecInfoURL', type: 'String' },
      0x6b240: { name: 'CodecDownloadURL', type: 'String' },
      0x2a: { name: 'CodecDecodeAll', type: 'Uint' },
      0x2fab: { name: 'TrackOverlay', type: 'Uint' },
      0x16aa: { name: 'CodecDelay', type: 'Uint' },
      0x16bb: { name: 'SeekPreRoll', type: 'Uint' },
      0x2624: { name: 'TrackTranslate', type: 'Container' },
      0x26fc: { name: 'TrackTranslateEditionUID', type: 'Uint' },
      0x26bf: { name: 'TrackTranslateCodec', type: 'Uint' },
      0x26a5: { name: 'TrackTranslateTrackID', type: 'Binary' },
      0x60: { name: 'Video', type: 'Container' },
      0x1a: { name: 'FlagInterlaced', type: 'Uint' },
      0x13b8: { name: 'StereoMode', type: 'Uint' },
      0x13c0: { name: 'AlphaMode', type: 'Uint' },
      0x13b9: { name: 'OldStereoMode', type: 'Uint' },
      0x30: { name: 'PixelWidth', type: 'Uint' },
      0x3a: { name: 'PixelHeight', type: 'Uint' },
      0x14aa: { name: 'PixelCropBottom', type: 'Uint' },
      0x14bb: { name: 'PixelCropTop', type: 'Uint' },
      0x14cc: { name: 'PixelCropLeft', type: 'Uint' },
      0x14dd: { name: 'PixelCropRight', type: 'Uint' },
      0x14b0: { name: 'DisplayWidth', type: 'Uint' },
      0x14ba: { name: 'DisplayHeight', type: 'Uint' },
      0x14b2: { name: 'DisplayUnit', type: 'Uint' },
      0x14b3: { name: 'AspectRatioType', type: 'Uint' },
      0xeb524: { name: 'ColourSpace', type: 'Binary' },
      0xfb523: { name: 'GammaValue', type: 'Float' },
      0x383e3: { name: 'FrameRate', type: 'Float' },
      0x61: { name: 'Audio', type: 'Container' },
      0x35: { name: 'SamplingFrequency', type: 'Float' },
      0x38b5: { name: 'OutputSamplingFrequency', type: 'Float' },
      0x1f: { name: 'Channels', type: 'Uint' },
      0x3d7b: { name: 'ChannelPositions', type: 'Binary' },
      0x2264: { name: 'BitDepth', type: 'Uint' },
      0x62: { name: 'TrackOperation', type: 'Container' },
      0x63: { name: 'TrackCombinePlanes', type: 'Container' },
      0x64: { name: 'TrackPlane', type: 'Container' },
      0x65: { name: 'TrackPlaneUID', type: 'Uint' },
      0x66: { name: 'TrackPlaneType', type: 'Uint' },
      0x69: { name: 'TrackJoinBlocks', type: 'Container' },
      0x6d: { name: 'TrackJoinUID', type: 'Uint' },
      0x40: { name: 'TrickTrackUID', type: 'Uint' },
      0x41: { name: 'TrickTrackSegmentUID', type: 'Binary' },
      0x46: { name: 'TrickTrackFlag', type: 'Uint' },
      0x47: { name: 'TrickMasterTrackUID', type: 'Uint' },
      0x44: { name: 'TrickMasterTrackSegmentUID', type: 'Binary' },
      0x2d80: { name: 'ContentEncodings', type: 'Container' },
      0x2240: { name: 'ContentEncoding', type: 'Container' },
      0x1031: { name: 'ContentEncodingOrder', type: 'Uint' },
      0x1032: { name: 'ContentEncodingScope', type: 'Uint' },
      0x1033: { name: 'ContentEncodingType', type: 'Uint' },
      0x1034: { name: 'ContentCompression', type: 'Container' },
      0x254: { name: 'ContentCompAlgo', type: 'Uint' },
      0x255: { name: 'ContentCompSettings', type: 'Binary' },
      0x1035: { name: 'ContentEncryption', type: 'Container' },
      0x7e1: { name: 'ContentEncAlgo', type: 'Uint' },
      0x7e2: { name: 'ContentEncKeyID', type: 'Binary' },
      0x7e3: { name: 'ContentSignature', type: 'Binary' },
      0x7e4: { name: 'ContentSigKeyID', type: 'Binary' },
      0x7e5: { name: 'ContentSigAlgo', type: 'Uint' },
      0x7e6: { name: 'ContentSigHashAlgo', type: 'Uint' },
      0xc53bb6b: { name: 'Cues', type: 'Container' },
      0x3b: { name: 'CuePoint', type: 'Container' },
      0x33: { name: 'CueTime', type: 'Uint' },
      0x37: { name: 'CueTrackPositions', type: 'Container' },
      0x77: { name: 'CueTrack', type: 'Uint' },
      0x71: { name: 'CueClusterPosition', type: 'Uint' },
      0x70: { name: 'CueRelativePosition', type: 'Uint' },
      0x32: { name: 'CueDuration', type: 'Uint' },
      0x1378: { name: 'CueBlockNumber', type: 'Uint' },
      0x6a: { name: 'CueCodecState', type: 'Uint' },
      0x5b: { name: 'CueReference', type: 'Container' },
      0x16: { name: 'CueRefTime', type: 'Uint' },
      0x17: { name: 'CueRefCluster', type: 'Uint' },
      0x135f: { name: 'CueRefNumber', type: 'Uint' },
      0x6b: { name: 'CueRefCodecState', type: 'Uint' },
      0x941a469: { name: 'Attachments', type: 'Container' },
      0x21a7: { name: 'AttachedFile', type: 'Container' },
      0x67e: { name: 'FileDescription', type: 'String' },
      0x66e: { name: 'FileName', type: 'String' },
      0x660: { name: 'FileMimeType', type: 'String' },
      0x65c: { name: 'FileData', type: 'Binary' },
      0x6ae: { name: 'FileUID', type: 'Uint' },
      0x675: { name: 'FileReferral', type: 'Binary' },
      0x661: { name: 'FileUsedStartTime', type: 'Uint' },
      0x662: { name: 'FileUsedEndTime', type: 'Uint' },
      0x43a770: { name: 'Chapters', type: 'Container' },
      0x5b9: { name: 'EditionEntry', type: 'Container' },
      0x5bc: { name: 'EditionUID', type: 'Uint' },
      0x5bd: { name: 'EditionFlagHidden', type: 'Uint' },
      0x5db: { name: 'EditionFlagDefault', type: 'Uint' },
      0x5dd: { name: 'EditionFlagOrdered', type: 'Uint' },
      0x36: { name: 'ChapterAtom', type: 'Container' },
      0x33c4: { name: 'ChapterUID', type: 'Uint' },
      0x1654: { name: 'ChapterStringUID', type: 'String' },
      0x11: { name: 'ChapterTimeStart', type: 'Uint' },
      0x12: { name: 'ChapterTimeEnd', type: 'Uint' },
      0x18: { name: 'ChapterFlagHidden', type: 'Uint' },
      0x598: { name: 'ChapterFlagEnabled', type: 'Uint' },
      0x2e67: { name: 'ChapterSegmentUID', type: 'Binary' },
      0x2ebc: { name: 'ChapterSegmentEditionUID', type: 'Uint' },
      0x23c3: { name: 'ChapterPhysicalEquiv', type: 'Uint' },
      0xf: { name: 'ChapterTrack', type: 'Container' },
      0x9: { name: 'ChapterTrackNumber', type: 'Uint' },
      0x0: { name: 'ChapterDisplay', type: 'Container' },
      0x5: { name: 'ChapString', type: 'String' },
      0x37c: { name: 'ChapLanguage', type: 'String' },
      0x37e: { name: 'ChapCountry', type: 'String' },
      0x2944: { name: 'ChapProcess', type: 'Container' },
      0x2955: { name: 'ChapProcessCodecID', type: 'Uint' },
      0x50d: { name: 'ChapProcessPrivate', type: 'Binary' },
      0x2911: { name: 'ChapProcessCommand', type: 'Container' },
      0x2922: { name: 'ChapProcessTime', type: 'Uint' },
      0x2933: { name: 'ChapProcessData', type: 'Binary' },
      0x254c367: { name: 'Tags', type: 'Container' },
      0x3373: { name: 'Tag', type: 'Container' },
      0x23c0: { name: 'Targets', type: 'Container' },
      0x28ca: { name: 'TargetTypeValue', type: 'Uint' },
      0x23ca: { name: 'TargetType', type: 'String' },
      0x23c5: { name: 'TagTrackUID', type: 'Uint' },
      0x23c9: { name: 'TagEditionUID', type: 'Uint' },
      0x23c4: { name: 'TagChapterUID', type: 'Uint' },
      0x23c6: { name: 'TagAttachmentUID', type: 'Uint' },
      0x27c8: { name: 'SimpleTag', type: 'Container' },
      0x5a3: { name: 'TagName', type: 'String' },
      0x47a: { name: 'TagLanguage', type: 'String' },
      0x484: { name: 'TagDefault', type: 'Uint' },
      0x487: { name: 'TagString', type: 'String' },
      0x485: { name: 'TagBinary', type: 'Binary' }
    };

    class WebmBase {
      constructor (name, type) {
        this.name = name || 'Unknown';
        this.type = type || 'Unknown';
      }

      updateBySource () { }
      setSource (source) {
        this.source = source;
        this.updateBySource();
      }

      updateByData () { }
      setData (data) {
        this.data = data;
        this.updateByData();
      }
    }

    class WebmUint extends WebmBase {
      constructor (name, type = 'Uint') {
        super(name, type);
      }

      updateBySource () {
        // use hex representation of a number instead of number value
        this.data = '';
        for (let i = 0; i < this.source.length; i++) {
          const hex = this.source[i].toString(16);
          this.data += padHex(hex);
        }
      }

      updateByData () {
        const length = this.data.length / 2;
        this.source = new Uint8Array(length);
        for (let i = 0; i < length; i++) {
          const hex = this.data.substr(i * 2, 2);
          this.source[i] = parseInt(hex, 16);
        }
      }

      getValue () {
        return parseInt(this.data, 16)
      }

      setValue (value) {
        this.setData(padHex(value.toString(16)));
      }
    }
    function padHex (hex) {
      return hex.length % 2 === 1 ? '0' + hex : hex
    }

    class WebmFloat extends WebmBase {
      constructor (name, type = 'Float') {
        super(name, type);
      }

      getFloatArrayType () {
        return this.source && this.source.length === 4 ? Float32Array : Float64Array
      }

      updateBySource () {
        const byteArray = this.source.reverse();
        const FloatArrayType = this.getFloatArrayType();
        const floatArray = new FloatArrayType(byteArray.buffer);
        this.data = floatArray[0];
      }

      updateByData () {
        const FloatArrayType = this.getFloatArrayType();
        const floatArray = new FloatArrayType([this.data]);
        const byteArray = new Uint8Array(floatArray.buffer);
        this.source = byteArray.reverse();
      }

      getValue () {
        return this.data
      }

      setValue (value) {
        this.setData(value);
      }
    }

    class WebmContainer extends WebmBase {
      constructor (name, type = 'Container') {
        super(name, type);
      }

      readByte () {
        return this.source[this.offset++]
      }

      readUint () {
        const firstByte = this.readByte();
        const bytes = 8 - firstByte.toString(2).length;
        let value = firstByte - (1 << (7 - bytes));
        for (let i = 0; i < bytes; i++) {
          // don't use bit operators to support x86
          value *= 256;
          value += this.readByte();
        }
        return value
      }

      updateBySource () {
        this.data = [];
        let end;
        for (this.offset = 0; this.offset < this.source.length; this.offset = end) {
          const id = this.readUint();
          const len = this.readUint();
          end = Math.min(this.offset + len, this.source.length);
          const data = this.source.slice(this.offset, end);

          const info = sections[id] || { name: 'Unknown', type: 'Unknown' };
          let Ctr = WebmBase;
          switch (info.type) {
            case 'Container':
              Ctr = WebmContainer;
              break
            case 'Uint':
              Ctr = WebmUint;
              break
            case 'Float':
              Ctr = WebmFloat;
              break
          }
          const section = new Ctr(info.name, info.type);
          section.setSource(data);
          this.data.push({
            id: id,
            idHex: id.toString(16),
            data: section
          });
        }
      }

      writeUint (x, draft) {
        let bytes = 1;
        let flag = 0x80;
        while (x >= flag && bytes < 8) {
          bytes++;
          flag *= 0x80;
        }

        if (!draft) {
          let value = flag + x;
          for (let i = bytes - 1; i >= 0; i--) {
            // don't use bit operators to support x86
            const c = value % 256;
            this.source[this.offset + i] = c;
            value = (value - c) / 256;
          }
        }

        this.offset += bytes;
      }

      writeSections (draft) {
        this.offset = 0;
        for (let i = 0; i < this.data.length; i++) {
          const section = this.data[i]; const content = section.data.source; const contentLength = content.length;
          this.writeUint(section.id, draft);
          this.writeUint(contentLength, draft);
          if (!draft) {
            this.source.set(content, this.offset);
          }
          this.offset += contentLength;
        }
        return this.offset
      }

      updateByData () {
        // run without accessing this.source to determine total length - need to know it to create Uint8Array
        const length = this.writeSections('draft');
        this.source = new Uint8Array(length);
        // now really write data
        this.writeSections();
      }

      getSectionById (id) {
        for (let i = 0; i < this.data.length; i++) {
          const section = this.data[i];
          if (section.id === id) {
            return section.data
          }
        }
        return null
      }
    }

    class WebmFile extends WebmContainer {
      constructor (source) {
        super('File', 'File');
        this.setSource(source);
      }

      fixDuration (duration) {
        const segmentSection = this.getSectionById(0x8538067);
        if (!segmentSection) return false

        const infoSection = segmentSection.getSectionById(0x549a966);
        if (!infoSection) return false

        const timeScaleSection = infoSection.getSectionById(0xad7b1);
        if (!timeScaleSection) return false

        let durationSection = infoSection.getSectionById(0x489);
        if (durationSection) {
          if (durationSection.getValue() <= 0) {
            durationSection.setValue(duration);
          } else {
            return false
          }
        } else {
          // append Duration section
          durationSection = new WebmFloat('Duration', 'Float');
          durationSection.setValue(duration);
          infoSection.data.push({
            id: 0x489,
            data: durationSection
          });
        }

        // set default time scale to 1 millisecond (1000000 nanoseconds)
        timeScaleSection.setValue(1000000);
        infoSection.updateByData();
        segmentSection.updateByData();
        this.updateByData();

        return true
      }

      toBlob (mimeType) {
        return new Blob([this.source.buffer], { type: mimeType || 'video/webm' })
      }
    }

    function fixDuration (blob, duration, callback) {
      return new Promise(resolve => {
        try {
          blob.arrayBuffer().then(buffer => {
            try {
              const file = new WebmFile(new Uint8Array(buffer));
              if (file.fixDuration(duration)) {
                blob = file.toBlob(blob.type);
              }
            } catch (ex) {
            // ignore
            }
            resolve(blob);
          });
        } catch (ex) {
          resolve(blob);
        }
      })
    }

    /* src\App.svelte generated by Svelte v3.44.0 */

    const { console: console_1 } = globals;

    const file = "src\\App.svelte";

    function create_fragment(ctx) {
    	let div0;
    	let installprompt;
    	let t0;
    	let div1;
    	let button;
    	let t1;
    	let a;
    	let t2;
    	let current;
    	let mounted;
    	let dispose;
    	installprompt = new InstallPrompt({ $$inline: true });

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			create_component(installprompt.$$.fragment);
    			t0 = space();
    			div1 = element("div");
    			button = element("button");
    			t1 = space();
    			a = element("a");
    			t2 = space();
    			attr_dev(div0, "class", "sticky-alerts d-flex flex-column-reverse svelte-x1j1gs");
    			add_location(div0, file, 64, 0, 2119);
    			attr_dev(button, "class", "btn");
    			add_location(button, file, 68, 2, 2274);
    			add_location(a, file, 69, 2, 2317);
    			attr_dev(div1, "class", "w-full h-full overflow-hidden position-relative dragarea");
    			add_location(div1, file, 67, 0, 2201);
    			document.title = "Screen Recorder";
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			mount_component(installprompt, div0, null);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, button);
    			append_dev(div1, t1);
    			append_dev(div1, a);
    			/*a_binding*/ ctx[2](a);
    			insert_dev(target, t2, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*record*/ ctx[1], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
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
    			/*a_binding*/ ctx[2](null);
    			if (detaching) detach_dev(t2);
    			mounted = false;
    			dispose();
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
    	navigator.serviceWorker.register('/sw.js');
    	let downloadLink;
    	let startTime = null;
    	let mediaRecorder;

    	const handleRecord = function ({ stream, mimeType }) {
    		// to collect stream chunks
    		let recordedChunks = [];

    		mediaRecorder = new MediaRecorder(stream,
    		{
    				audioBitsPerSecond: 128000,
    				videoBitsPerSecond: 2500000,
    				mimeType: 'video/x-matroska'
    			});

    		mediaRecorder.ondataavailable = function (e) {
    			if (e.data.size > 0) {
    				recordedChunks.push(e.data);
    			}
    		};

    		mediaRecorder.onstop = async function () {
    			const duration = Date.now() - startTime;
    			const blob = new Blob(recordedChunks);

    			for (const track of stream.getTracks()) {
    				track.stop();
    			}

    			const file = await fixDuration(blob.slice(0, 64), duration);
    			console.log(file, duration);
    			const patched = new Blob([file, blob.slice(64)]);
    			$$invalidate(0, downloadLink.href = URL.createObjectURL(patched), downloadLink);
    			$$invalidate(0, downloadLink.download = `${Date.now()}.mkv`, downloadLink);
    			downloadLink.click();
    		};

    		mediaRecorder.start(200); // here 200ms is interval of chunk collection
    		startTime = Date.now();
    	};

    	async function record() {
    		if (mediaRecorder) return mediaRecorder.stop();
    		const mimeType = 'video/x-matroska';

    		const displayStream = await navigator.mediaDevices.getDisplayMedia({
    			video: { frameRate: 60, cursor: 'always' },
    			audio: {
    				sampleSize: 256,
    				channelCount: 2,
    				echoCancellation: false
    			}
    		});

    		displayStream.oninactive = () => {
    			voiceStream.getAudioTracks()[0].stop();
    		};

    		console.log(displayStream);

    		// voiceStream for recording voice with screen recording
    		const voiceStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });

    		let tracks = [...displayStream.getTracks(), voiceStream.getAudioTracks()[0]];
    		const stream = new MediaStream(tracks);
    		handleRecord({ stream, mimeType });
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function a_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			downloadLink = $$value;
    			$$invalidate(0, downloadLink);
    		});
    	}

    	$$self.$capture_state = () => ({
    		InstallPrompt,
    		fixDuration,
    		downloadLink,
    		startTime,
    		mediaRecorder,
    		handleRecord,
    		record
    	});

    	$$self.$inject_state = $$props => {
    		if ('downloadLink' in $$props) $$invalidate(0, downloadLink = $$props.downloadLink);
    		if ('startTime' in $$props) startTime = $$props.startTime;
    		if ('mediaRecorder' in $$props) mediaRecorder = $$props.mediaRecorder;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [downloadLink, record, a_binding];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

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
