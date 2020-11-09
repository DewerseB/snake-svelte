
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
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

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
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
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
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
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    const active_docs = new Set();
    let active = 0;
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        const doc = node.ownerDocument;
        active_docs.add(doc);
        const stylesheet = doc.__svelte_stylesheet || (doc.__svelte_stylesheet = doc.head.appendChild(element('style')).sheet);
        const current_rules = doc.__svelte_rules || (doc.__svelte_rules = {});
        if (!current_rules[name]) {
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ''}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        const previous = (node.style.animation || '').split(', ');
        const next = previous.filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        );
        const deleted = previous.length - next.length;
        if (deleted) {
            node.style.animation = next.join(', ');
            active -= deleted;
            if (!active)
                clear_rules();
        }
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            active_docs.forEach(doc => {
                const stylesheet = doc.__svelte_stylesheet;
                let i = stylesheet.cssRules.length;
                while (i--)
                    stylesheet.deleteRule(i);
                doc.__svelte_rules = {};
            });
            active_docs.clear();
        });
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

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
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
    const null_transition = { duration: 0 };
    function create_in_transition(node, fn, params) {
        let config = fn(node, params);
        let running = false;
        let animation_name;
        let task;
        let uid = 0;
        function cleanup() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 0, 1, duration, delay, easing, css, uid++);
            tick(0, 1);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            if (task)
                task.abort();
            running = true;
            add_render_callback(() => dispatch(node, true, 'start'));
            task = loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(1, 0);
                        dispatch(node, true, 'end');
                        cleanup();
                        return running = false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(t, 1 - t);
                    }
                }
                return running;
            });
        }
        let started = false;
        return {
            start() {
                if (started)
                    return;
                delete_rule(node);
                if (is_function(config)) {
                    config = config();
                    wait().then(go);
                }
                else {
                    go();
                }
            },
            invalidate() {
                started = false;
            },
            end() {
                if (running) {
                    cleanup();
                    running = false;
                }
            }
        };
    }

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
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
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
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
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
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
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
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
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.29.4' }, detail)));
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
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
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

    /* src\components\Snake.svelte generated by Svelte v3.29.4 */

    const file = "src\\components\\Snake.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[4] = list[i];
    	child_ctx[6] = i;
    	return child_ctx;
    }

    // (67:4) {:else}
    function create_else_block(ctx) {
    	let div;
    	let div_class_value;
    	let div_style_value;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "class", div_class_value = "snake " + /*colorSnake*/ ctx[3] + " svelte-1ctkk5r");
    			attr_dev(div, "style", div_style_value = "width: " + (/*size*/ ctx[2] - 1) + "px; height: " + (/*size*/ ctx[2] - 1) + "px; left :" + /*part*/ ctx[4].x + "px; top:" + /*part*/ ctx[4].y + "px; z-index: 10;");
    			add_location(div, file, 67, 4, 1484);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*colorSnake*/ 8 && div_class_value !== (div_class_value = "snake " + /*colorSnake*/ ctx[3] + " svelte-1ctkk5r")) {
    				attr_dev(div, "class", div_class_value);
    			}

    			if (dirty & /*size, body*/ 5 && div_style_value !== (div_style_value = "width: " + (/*size*/ ctx[2] - 1) + "px; height: " + (/*size*/ ctx[2] - 1) + "px; left :" + /*part*/ ctx[4].x + "px; top:" + /*part*/ ctx[4].y + "px; z-index: 10;")) {
    				attr_dev(div, "style", div_style_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(67:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (57:4) {#if i === 0}
    function create_if_block(ctx) {
    	let div2;
    	let div0;
    	let t;
    	let div1;
    	let div2_class_value;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			t = space();
    			div1 = element("div");
    			attr_dev(div0, "class", "eye svelte-1ctkk5r");
    			set_style(div0, "top", /*size*/ ctx[2] / 5 + "px");
    			set_style(div0, "left", /*size*/ ctx[2] * 5 / 8 + "px");
    			add_location(div0, file, 58, 8, 1247);
    			attr_dev(div1, "class", "eye svelte-1ctkk5r");
    			set_style(div1, "top", /*size*/ ctx[2] * 2 / 5 + "px");
    			set_style(div1, "left", /*size*/ ctx[2] * 5 / 8 + "px");
    			add_location(div1, file, 61, 8, 1336);
    			attr_dev(div2, "class", div2_class_value = "snake " + /*colorSnake*/ ctx[3] + " " + /*direction*/ ctx[1] + " svelte-1ctkk5r");
    			set_style(div2, "width", /*size*/ ctx[2] - 1 + "px");
    			set_style(div2, "height", /*size*/ ctx[2] - 1 + "px");
    			set_style(div2, "left", /*part*/ ctx[4].x + "px");
    			set_style(div2, "top", /*part*/ ctx[4].y + "px");
    			set_style(div2, "z-index", "20");
    			add_location(div2, file, 57, 4, 1099);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div2, t);
    			append_dev(div2, div1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*size*/ 4) {
    				set_style(div0, "top", /*size*/ ctx[2] / 5 + "px");
    			}

    			if (dirty & /*size*/ 4) {
    				set_style(div0, "left", /*size*/ ctx[2] * 5 / 8 + "px");
    			}

    			if (dirty & /*size*/ 4) {
    				set_style(div1, "top", /*size*/ ctx[2] * 2 / 5 + "px");
    			}

    			if (dirty & /*size*/ 4) {
    				set_style(div1, "left", /*size*/ ctx[2] * 5 / 8 + "px");
    			}

    			if (dirty & /*colorSnake, direction*/ 10 && div2_class_value !== (div2_class_value = "snake " + /*colorSnake*/ ctx[3] + " " + /*direction*/ ctx[1] + " svelte-1ctkk5r")) {
    				attr_dev(div2, "class", div2_class_value);
    			}

    			if (dirty & /*size*/ 4) {
    				set_style(div2, "width", /*size*/ ctx[2] - 1 + "px");
    			}

    			if (dirty & /*size*/ 4) {
    				set_style(div2, "height", /*size*/ ctx[2] - 1 + "px");
    			}

    			if (dirty & /*body*/ 1) {
    				set_style(div2, "left", /*part*/ ctx[4].x + "px");
    			}

    			if (dirty & /*body*/ 1) {
    				set_style(div2, "top", /*part*/ ctx[4].y + "px");
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(57:4) {#if i === 0}",
    		ctx
    	});

    	return block;
    }

    // (55:0) {#each body as part, i}
    function create_each_block(ctx) {
    	let t;

    	function select_block_type(ctx, dirty) {
    		if (/*i*/ ctx[6] === 0) return create_if_block;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			t = space();
    		},
    		m: function mount(target, anchor) {
    			if_block.m(target, anchor);
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if_block.p(ctx, dirty);
    		},
    		d: function destroy(detaching) {
    			if_block.d(detaching);
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(55:0) {#each body as part, i}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let each_1_anchor;
    	let each_value = /*body*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*colorSnake, direction, size, body*/ 15) {
    				each_value = /*body*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
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
    	validate_slots("Snake", slots, []);
    	let { body = [{ x: 80, y: 0 }, { x: 40, y: 0 }, { x: 0, y: 0 }] } = $$props;
    	let { direction = "right" } = $$props;
    	let { size = 40 } = $$props;
    	let { colorSnake = "green" } = $$props;
    	const writable_props = ["body", "direction", "size", "colorSnake"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Snake> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("body" in $$props) $$invalidate(0, body = $$props.body);
    		if ("direction" in $$props) $$invalidate(1, direction = $$props.direction);
    		if ("size" in $$props) $$invalidate(2, size = $$props.size);
    		if ("colorSnake" in $$props) $$invalidate(3, colorSnake = $$props.colorSnake);
    	};

    	$$self.$capture_state = () => ({ body, direction, size, colorSnake });

    	$$self.$inject_state = $$props => {
    		if ("body" in $$props) $$invalidate(0, body = $$props.body);
    		if ("direction" in $$props) $$invalidate(1, direction = $$props.direction);
    		if ("size" in $$props) $$invalidate(2, size = $$props.size);
    		if ("colorSnake" in $$props) $$invalidate(3, colorSnake = $$props.colorSnake);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [body, direction, size, colorSnake];
    }

    class Snake extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance, create_fragment, safe_not_equal, {
    			body: 0,
    			direction: 1,
    			size: 2,
    			colorSnake: 3
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Snake",
    			options,
    			id: create_fragment.name
    		});
    	}

    	get body() {
    		throw new Error("<Snake>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set body(value) {
    		throw new Error("<Snake>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get direction() {
    		throw new Error("<Snake>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set direction(value) {
    		throw new Error("<Snake>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get size() {
    		throw new Error("<Snake>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set size(value) {
    		throw new Error("<Snake>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get colorSnake() {
    		throw new Error("<Snake>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set colorSnake(value) {
    		throw new Error("<Snake>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\Food.svelte generated by Svelte v3.29.4 */

    const file$1 = "src\\components\\Food.svelte";

    function create_fragment$1(ctx) {
    	let div;
    	let img;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			div = element("div");
    			img = element("img");
    			attr_dev(img, "class", "imgFood svelte-1nona8c");
    			if (img.src !== (img_src_value = /*imgSrc*/ ctx[3])) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "mouse");
    			add_location(img, file$1, 26, 4, 454);
    			attr_dev(div, "class", "food svelte-1nona8c");
    			set_style(div, "width", /*size*/ ctx[2] + "px");
    			set_style(div, "height", /*size*/ ctx[2] + "px");
    			set_style(div, "left", /*x*/ ctx[0] + "px");
    			set_style(div, "top", /*y*/ ctx[1] + "px");
    			add_location(div, file$1, 23, 0, 333);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, img);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*size*/ 4) {
    				set_style(div, "width", /*size*/ ctx[2] + "px");
    			}

    			if (dirty & /*size*/ 4) {
    				set_style(div, "height", /*size*/ ctx[2] + "px");
    			}

    			if (dirty & /*x*/ 1) {
    				set_style(div, "left", /*x*/ ctx[0] + "px");
    			}

    			if (dirty & /*y*/ 2) {
    				set_style(div, "top", /*y*/ ctx[1] + "px");
    			}
    		},
    		i: noop,
    		o: noop,
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
    	validate_slots("Food", slots, []);
    	let { x = 80 } = $$props;
    	let { y = 80 } = $$props;
    	let { size = 40 } = $$props;

    	// Food image
    	let imgSrc = "./img/mouse.png";

    	const writable_props = ["x", "y", "size"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Food> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("x" in $$props) $$invalidate(0, x = $$props.x);
    		if ("y" in $$props) $$invalidate(1, y = $$props.y);
    		if ("size" in $$props) $$invalidate(2, size = $$props.size);
    	};

    	$$self.$capture_state = () => ({ x, y, size, imgSrc });

    	$$self.$inject_state = $$props => {
    		if ("x" in $$props) $$invalidate(0, x = $$props.x);
    		if ("y" in $$props) $$invalidate(1, y = $$props.y);
    		if ("size" in $$props) $$invalidate(2, size = $$props.size);
    		if ("imgSrc" in $$props) $$invalidate(3, imgSrc = $$props.imgSrc);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [x, y, size, imgSrc];
    }

    class Food extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { x: 0, y: 1, size: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Food",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get x() {
    		throw new Error("<Food>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set x(value) {
    		throw new Error("<Food>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get y() {
    		throw new Error("<Food>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set y(value) {
    		throw new Error("<Food>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get size() {
    		throw new Error("<Food>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set size(value) {
    		throw new Error("<Food>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\Random.svelte generated by Svelte v3.29.4 */

    function randomPos(max, square) {
    	let pos = Math.floor(Math.random() * (max / square - 1)) * square;
    	return pos;
    }

    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }

    function fade(node, { delay = 0, duration = 400, easing = identity }) {
        const o = +getComputedStyle(node).opacity;
        return {
            delay,
            duration,
            easing,
            css: t => `opacity: ${t * o}`
        };
    }
    function fly(node, { delay = 0, duration = 400, easing = cubicOut, x = 0, y = 0, opacity = 0 }) {
        const style = getComputedStyle(node);
        const target_opacity = +style.opacity;
        const transform = style.transform === 'none' ? '' : style.transform;
        const od = target_opacity * (1 - opacity);
        return {
            delay,
            duration,
            easing,
            css: (t, u) => `
			transform: ${transform} translate(${(1 - t) * x}px, ${(1 - t) * y}px);
			opacity: ${target_opacity - (od * u)}`
        };
    }

    /* src\components\Game.svelte generated by Svelte v3.29.4 */
    const file$2 = "src\\components\\Game.svelte";

    // (235:4) {:else}
    function create_else_block$1(ctx) {
    	let h2;
    	let h2_intro;
    	let t1;
    	let p;
    	let p_intro;

    	const block = {
    		c: function create() {
    			h2 = element("h2");
    			h2.textContent = "Game Lost !!!";
    			t1 = space();
    			p = element("p");
    			p.textContent = `Your score is ${/*score*/ ctx[4]}`;
    			add_location(h2, file$2, 235, 4, 6501);
    			add_location(p, file$2, 236, 4, 6537);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h2, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, p, anchor);
    		},
    		p: noop,
    		i: function intro(local) {
    			if (!h2_intro) {
    				add_render_callback(() => {
    					h2_intro = create_in_transition(h2, fade, {});
    					h2_intro.start();
    				});
    			}

    			if (!p_intro) {
    				add_render_callback(() => {
    					p_intro = create_in_transition(p, fly, { x: 100, duration: 1000 });
    					p_intro.start();
    				});
    			}
    		},
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h2);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(235:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (227:4) {#if !isLost}
    function create_if_block$1(ctx) {
    	let snake_1;
    	let t;
    	let food_1;
    	let current;
    	const snake_1_spread_levels = [/*snake*/ ctx[3]];
    	let snake_1_props = {};

    	for (let i = 0; i < snake_1_spread_levels.length; i += 1) {
    		snake_1_props = assign(snake_1_props, snake_1_spread_levels[i]);
    	}

    	snake_1 = new Snake({ props: snake_1_props, $$inline: true });
    	const food_1_spread_levels = [/*food*/ ctx[5]];
    	let food_1_props = {};

    	for (let i = 0; i < food_1_spread_levels.length; i += 1) {
    		food_1_props = assign(food_1_props, food_1_spread_levels[i]);
    	}

    	food_1 = new Food({ props: food_1_props, $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(snake_1.$$.fragment);
    			t = space();
    			create_component(food_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(snake_1, target, anchor);
    			insert_dev(target, t, anchor);
    			mount_component(food_1, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const snake_1_changes = (dirty & /*snake*/ 8)
    			? get_spread_update(snake_1_spread_levels, [get_spread_object(/*snake*/ ctx[3])])
    			: {};

    			snake_1.$set(snake_1_changes);

    			const food_1_changes = (dirty & /*food*/ 32)
    			? get_spread_update(food_1_spread_levels, [get_spread_object(/*food*/ ctx[5])])
    			: {};

    			food_1.$set(food_1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(snake_1.$$.fragment, local);
    			transition_in(food_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(snake_1.$$.fragment, local);
    			transition_out(food_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(snake_1, detaching);
    			if (detaching) detach_dev(t);
    			destroy_component(food_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(227:4) {#if !isLost}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let section0;
    	let current_block_type_index;
    	let if_block;
    	let t0;
    	let section1;
    	let p;
    	let current;
    	let mounted;
    	let dispose;
    	const if_block_creators = [create_if_block$1, create_else_block$1];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (!/*isLost*/ ctx[2]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			section0 = element("section");
    			if_block.c();
    			t0 = space();
    			section1 = element("section");
    			p = element("p");
    			p.textContent = `Score : ${/*score*/ ctx[4]}`;
    			attr_dev(section0, "class", "gameArea svelte-ztvzuz");
    			set_style(section0, "width", /*width*/ ctx[0] + "px");
    			set_style(section0, "height", /*height*/ ctx[1] + "px");
    			add_location(section0, file$2, 224, 0, 6131);
    			add_location(p, file$2, 255, 3, 6814);
    			attr_dev(section1, "class", "svelte-ztvzuz");
    			add_location(section1, file$2, 253, 0, 6772);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section0, anchor);
    			if_blocks[current_block_type_index].m(section0, null);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, section1, anchor);
    			append_dev(section1, p);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(window, "keydown", /*handleKeydown*/ ctx[6], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}

    				transition_in(if_block, 1);
    				if_block.m(section0, null);
    			}

    			if (!current || dirty & /*width*/ 1) {
    				set_style(section0, "width", /*width*/ ctx[0] + "px");
    			}

    			if (!current || dirty & /*height*/ 2) {
    				set_style(section0, "height", /*height*/ ctx[1] + "px");
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section0);
    			if_blocks[current_block_type_index].d();
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(section1);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function eatingTest() {
    	
    }

    /**
     * Generates a food with random x and y positions
     * Recursively calls itself until it creates a food that doesn't collide with the snake
     * @return the food or the function itself
     */
    function getFood() {
    	
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Game", slots, []);
    	let { width = 600 } = $$props;
    	let { height = 400 } = $$props;
    	let { squareSize = 40 } = $$props;

    	// Variables of the game
    	let score = 0;

    	let loop;
    	let timer = 500;
    	let choosedDirection = false;
    	let isLost = false;

    	/**
     * The snake object
     * .body is an array of objects containing every bodypart of the snake, the first element is the head
     * .direction is a string the snake is currently facing (right, left, up, down)
     * .size is the size of the square representing a bodypart
    */
    	let snake = {
    		body: [
    			{ x: 0, y: 0, oldX: 0, oldY: 0 },
    			{ x: 0, y: 0, oldX: 0, oldY: 0 },
    			{ x: 0, y: 0, oldX: 0, oldY: 0 }
    		],
    		direction: "right",
    		size: squareSize,
    		colorSnake: "green"
    	};

    	/**
     * The food object
     * .x and .y are numbers representing the coordinates of the food
     * .size is the size of the square representing the food
    */
    	let food = {
    		x: randomPos(width, squareSize),
    		y: randomPos(height, squareSize),
    		size: squareSize
    	};

    	// Game loop to handle the interval of the game -----------------------------------------
    	function gameLoop() {
    		loop = setInterval(
    			() => {
    				move();
    				losingTest();
    			},
    			timer
    		);
    	}

    	// Main functions for the gameloop -------------------------------------------------------
    	/**
     * Moves each snake bodyparts based on the snake direction
     */
    	function move() {
    		for (let i = 0; i < snake.body.length; i++) {
    			$$invalidate(3, snake.body[i].oldX = snake.body[i].x, snake);
    			$$invalidate(3, snake.body[i].oldY = snake.body[i].y, snake);

    			if (i === 0) {
    				if (snake.direction === "right") {
    					$$invalidate(3, snake.body[i].x += squareSize, snake);
    				}

    				if (snake.direction === "left") {
    					$$invalidate(3, snake.body[i].x -= squareSize, snake);
    				}

    				if (snake.direction === "down") {
    					$$invalidate(3, snake.body[i].y += squareSize, snake);
    				}

    				if (snake.direction === "up") {
    					$$invalidate(3, snake.body[i].y -= squareSize, snake);
    				}
    			} else {
    				$$invalidate(3, snake.body[i].x = snake.body[i - 1].oldX, snake);
    				$$invalidate(3, snake.body[i].y = snake.body[i - 1].oldY, snake);
    			}
    		}

    		
    		choosedDirection = false;
    	}

    	/**
     * Tests if the snake collide with the border or with himself, if so:
     * - sets isLost to true
     * - clears the loop interval
     */
    	function losingTest() {
    		if (snake.body[0].x >= width || snake.body[0].x < 0 || snake.body[0].y >= height || snake.body[0].y < 0) {
    			$$invalidate(2, isLost = true);
    			clearInterval(loop);
    		} else {
    			snake.body.forEach((bodypart, i) => {
    				if (i !== 0 && collide(snake.body[0], bodypart)) {
    					$$invalidate(2, isLost = true);
    					clearInterval(loop);
    				}
    			});
    		}
    	}

    	// Utility functions -------------------------------------------------------
    	/**
     * Tests if 2 rectangles collide
     * @param {Object} rect1 An object with x and y keys
     * @param {Object} rect2 An object with x and y keys
     * @return {Boolean} true if rect1 and rect2 collide
    */
    	function collide(rect1, rect2) {
    		if (rect1.x < rect2.x + squareSize && rect1.x + squareSize > rect2.x && rect1.y < rect2.y + squareSize && rect1.y + squareSize > rect2.y) {
    			return true;
    		}

    		return false;
    	}

    	// Event listener -------------------------------------------------------
    	function handleKeydown(event) {
    		let keyCode = event.keyCode;

    		if (!choosedDirection && !isLost) {
    			if (keyCode === 39 && snake.direction !== "left") {
    				$$invalidate(3, snake.direction = "right", snake);
    				choosedDirection = true;
    			}

    			if (keyCode === 37 && snake.direction !== "right") {
    				$$invalidate(3, snake.direction = "left", snake);
    				choosedDirection = true;
    			}

    			if (keyCode === 40 && snake.direction !== "up") {
    				$$invalidate(3, snake.direction = "down", snake);
    				choosedDirection = true;
    			}

    			if (keyCode === 38 && snake.direction !== "down") {
    				$$invalidate(3, snake.direction = "up", snake);
    				choosedDirection = true;
    			}
    		}
    	}

    	// Automaticaly calls the game loop when the component is loaded ----------
    	(() => {
    		gameLoop();
    	})();

    	const writable_props = ["width", "height", "squareSize"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Game> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("width" in $$props) $$invalidate(0, width = $$props.width);
    		if ("height" in $$props) $$invalidate(1, height = $$props.height);
    		if ("squareSize" in $$props) $$invalidate(7, squareSize = $$props.squareSize);
    	};

    	$$self.$capture_state = () => ({
    		Snake,
    		Food,
    		randomPos,
    		fade,
    		fly,
    		width,
    		height,
    		squareSize,
    		score,
    		loop,
    		timer,
    		choosedDirection,
    		isLost,
    		snake,
    		food,
    		gameLoop,
    		move,
    		eatingTest,
    		losingTest,
    		collide,
    		getFood,
    		handleKeydown
    	});

    	$$self.$inject_state = $$props => {
    		if ("width" in $$props) $$invalidate(0, width = $$props.width);
    		if ("height" in $$props) $$invalidate(1, height = $$props.height);
    		if ("squareSize" in $$props) $$invalidate(7, squareSize = $$props.squareSize);
    		if ("score" in $$props) $$invalidate(4, score = $$props.score);
    		if ("loop" in $$props) loop = $$props.loop;
    		if ("timer" in $$props) timer = $$props.timer;
    		if ("choosedDirection" in $$props) choosedDirection = $$props.choosedDirection;
    		if ("isLost" in $$props) $$invalidate(2, isLost = $$props.isLost);
    		if ("snake" in $$props) $$invalidate(3, snake = $$props.snake);
    		if ("food" in $$props) $$invalidate(5, food = $$props.food);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [width, height, isLost, snake, score, food, handleKeydown, squareSize];
    }

    class Game extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { width: 0, height: 1, squareSize: 7 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Game",
    			options,
    			id: create_fragment$2.name
    		});
    	}

    	get width() {
    		throw new Error("<Game>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set width(value) {
    		throw new Error("<Game>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get height() {
    		throw new Error("<Game>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set height(value) {
    		throw new Error("<Game>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get squareSize() {
    		throw new Error("<Game>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set squareSize(value) {
    		throw new Error("<Game>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\App.svelte generated by Svelte v3.29.4 */
    const file$3 = "src\\App.svelte";

    function create_fragment$3(ctx) {
    	let main;
    	let h1;
    	let t1;
    	let game_1;
    	let current;
    	const game_1_spread_levels = [/*game*/ ctx[0]];
    	let game_1_props = {};

    	for (let i = 0; i < game_1_spread_levels.length; i += 1) {
    		game_1_props = assign(game_1_props, game_1_spread_levels[i]);
    	}

    	game_1 = new Game({ props: game_1_props, $$inline: true });

    	const block = {
    		c: function create() {
    			main = element("main");
    			h1 = element("h1");
    			h1.textContent = "Snake";
    			t1 = space();
    			create_component(game_1.$$.fragment);
    			add_location(h1, file$3, 24, 1, 413);
    			attr_dev(main, "class", "svelte-lbhzz2");
    			add_location(main, file$3, 23, 0, 404);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, h1);
    			append_dev(main, t1);
    			mount_component(game_1, main, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const game_1_changes = (dirty & /*game*/ 1)
    			? get_spread_update(game_1_spread_levels, [get_spread_object(/*game*/ ctx[0])])
    			: {};

    			game_1.$set(game_1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(game_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(game_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(game_1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function gameInit() {
    	
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	let game = { width: 600, height: 400 };
    	
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Game, game, gameInit });

    	$$self.$inject_state = $$props => {
    		if ("game" in $$props) $$invalidate(0, game = $$props.game);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [game];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
