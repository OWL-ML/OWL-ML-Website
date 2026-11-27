"""Record step-by-step states of small Python snippets (names -> objects), Python Tutor style.

usage: python3 pytrace.py traces.json

Runs each snippet under sys.settrace, stores every executed line's frames, objects and output,
and checks that the snippet's real output matches the option marked as correct ("answer")."""
import sys, io, json, types

CIRCLED = "①②③④⑤⑥⑦⑧⑨⑩⑪⑫"

def trace(src):
    code = compile(src, "<snippet>", "exec")
    steps, keep, labels = [], [], {}
    out = io.StringIO()
    g = {"__name__": "__main__"}

    def label(o):
        if id(o) not in labels:
            labels[id(o)] = CIRCLED[len(labels)]; keep.append(o)
        return labels[id(o)]

    def val(o, heap):
        if isinstance(o, (int, float, bool, type(None))):
            return {"prim": repr(o)}
        lab = label(o)
        if lab not in heap:
            heap[lab] = None
            if isinstance(o, list):
                parts = []
                for e in o:
                    if isinstance(e, (int, float, bool, str, type(None))):
                        parts.append(repr(e))
                    else:
                        parts.append(val(e, heap)["ref"])
                heap[lab] = {"type": "list", "text": "[" + ", ".join(parts) + "]"}
            elif isinstance(o, str):
                heap[lab] = {"type": "str", "text": repr(o)}
            elif isinstance(o, types.FunctionType):
                name = o.__name__
                params = list(o.__code__.co_varnames[:o.__code__.co_argcount])
                d = o.__defaults__ or ()
                parts = []
                for k, p in enumerate(params):
                    j = k - (len(params) - len(d))
                    if j >= 0:
                        v = val(d[j], heap)
                        parts.append(p + "=" + (v["prim"] if "prim" in v else v["ref"]))
                    else:
                        parts.append(p)
                heap[lab] = {"type": "function", "text": ("lambda" if name == "<lambda>" else "def " + name) + "(" + ", ".join(parts) + ")"}
            else:
                heap[lab] = {"type": type(o).__name__, "text": repr(o)}
        return {"ref": lab}

    def snapshot(frame, line):
        stack = []
        f = frame
        while f is not None and f.f_code.co_filename == "<snippet>":
            stack.append(f); f = f.f_back
        stack.reverse()
        heap, frames = {}, []
        for f in stack:
            name = "Global" if f.f_code.co_name == "<module>" else ("lambda" if f.f_code.co_name == "<lambda>" else f.f_code.co_name + "()")
            if f.f_code.co_name == "<module>":
                loc = dict(f.f_globals)
                for k, v in f.f_locals.items():
                    loc.setdefault(k, v)
            else:
                loc = f.f_locals
            items = [(k, v) for k, v in loc.items() if not k.startswith("__") and not k.startswith(".")]
            frames.append({"name": name, "vars": [{"name": k, "v": val(v, heap)} for k, v in items]})
        steps.append({"line": line, "frames": frames, "heap": [{"label": k, **v} for k, v in sorted(heap.items(), key=lambda kv: CIRCLED.index(kv[0]))], "out": out.getvalue()})

    def tracer(frame, event, arg):
        if frame.f_code.co_filename != "<snippet>":
            return None
        if event == "line":
            snapshot(frame, frame.f_lineno)
        return tracer

    old = sys.stdout; sys.stdout = out
    try:
        sys.settrace(tracer); exec(code, g)
    finally:
        sys.settrace(None); sys.stdout = old
    # final state: globals after the program ended
    heap, frames = {}, []
    items = [(k, v) for k, v in g.items() if not k.startswith("__")]
    frames.append({"name": "Global", "vars": [{"name": k, "v": val(v, heap)} for k, v in items]})
    steps.append({"line": None, "frames": frames, "heap": [{"label": k, **v} for k, v in sorted(heap.items(), key=lambda kv: CIRCLED.index(kv[0]))], "out": out.getvalue()})
    return steps, out.getvalue()

SNIPPETS = [
 {"id": "alias", "answer": 1, "title": "Two names, one list",
  "code": "a = [1, 2, 3]\nb = a\nb.append(4)\nprint(a)\n",
  "options": ["[1, 2, 3]", "[1, 2, 3, 4]", "An error"],
  "lesson": "Assignment never copies. b = a gives the same list a second name, so changing it through b changes what a sees. Use b = a.copy() for an independent list."},
 {"id": "plus", "answer": 2, "title": "+= on a string and on a list",
  "code": "s = \"owl\"\nt = s\nt += \"s\"\nprint(s)\n\nx = [1]\ny = x\ny += [2]\nprint(x)\n",
  "options": ["owls, then [1, 2]", "owl, then [1]", "owl, then [1, 2]", "owls, then [1]"],
  "lesson": "Strings cannot be changed, so t += \"s\" builds a new string and moves the name t to it. The name s still points to \"owl\". Lists can be changed, so y += [2] extends the existing list in place, which x shares."},
 {"id": "default", "answer": 1, "title": "A default that remembers",
  "code": "def add(item, bag=[]):\n    bag.append(item)\n    return bag\n\nprint(add(\"a\"))\nprint(add(\"b\"))\n",
  "options": ["['a'], then ['b']", "['a'], then ['a', 'b']", "An error"],
  "lesson": "The default list is created once, when def runs, and stored with the function. Every call without a bag reuses that same list. Write bag=None and create a new list inside the function instead."},
 {"id": "late", "answer": 1, "title": "Functions made in a loop",
  "code": "fns = []\nfor i in range(3):\n    fns.append(lambda: i)\n\nprint([f() for f in fns])\n",
  "options": ["[0, 1, 2]", "[2, 2, 2]", "[3, 3, 3]"],
  "lesson": "A lambda looks up i at the moment it is called. By then the loop has finished and i is 2 for all three. Write lambda i=i: i to capture the current value."},
]
result = []
for sn in SNIPPETS:
    steps, out = trace(sn["code"])
    first = out.strip().splitlines()
    sn = dict(sn); sn["steps"] = steps; sn["output"] = out
    result.append(sn)
    said = ", then ".join(out.strip().splitlines())
    assert said == sn["options"][sn["answer"]], (sn["id"], said, sn["options"][sn["answer"]])
    print(sn["id"], len(steps), "steps; output:", out.replace("\n", " | "))
json.dump({"python": sys.version.split()[0], "snippets": result}, open(sys.argv[1], "w"), ensure_ascii=False)
