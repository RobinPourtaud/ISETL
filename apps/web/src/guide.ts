export const guide = `
<div class="eyebrow">REFERENCE</div><h2>ISETL syntax</h2>
<p>ISETL is an interactive language for exploring mathematics. Every statement ends with a semicolon. An expression on its own prints its value.</p>
<div class="reference-grid">
<section><h3>Sets & tuples</h3><pre>A := {1, 2, 3};
t := [10, 20, 30];
{1..10};          $ A range
A + {4};          $ Union
A * {2, 3};       $ Intersection
A - {3};          $ Difference
#A;               $ Cardinality
t(1);             $ First element
pow(A);           $ Power set</pre></section>
<section><h3>Comprehensions</h3><pre>{n*n : n in {1..5}};
[n : n in [1..10] | n mod 2 = 0];

forall n in {1..5} | n > 0;
exists n in {1..5} | n = 3;

2 in A;
{1, 2} subset A;</pre></section>
<section><h3>Functions & flow</h3><pre>square := func(x);
  return x*x;
end;

for x in [1..5] do
  print square(x);
end;

if 2 in A then print "Yes!"; end;</pre></section>
<section><h3>Maps & relations</h3><pre>f := {[1, "one"], [2, "two"]};
f(1);             $ "one"
domain(f);        $ {1, 2}
image(f);         $ {"one", "two"}
f{1};             $ Set of images

om;               $ Undefined
!rational on
1/3 + 1/6;        $ Exactly 1/2</pre></section>
<section><h3>Input & files</h3><pre>read n;           $ Console input
print n;
writeln "Hello";  $ No quotes

f := openw("data.txt");
print [1,2,3] to f;
close(f);
!include helpers.stl</pre></section>
<section><h3>Graphics</h3><pre>graphics(true);
scale(-5, 5, -5, 5);
move(0, 0); draw(3, 2);
textout(0, 1, "hello");
point(2, 2, 3);

!include donplot.stl
$ See the classic plotter example.</pre></section>
</div>
<section><h3>Cantor’s theorem</h3>
<p>The Cantor example follows <a href="https://pourtaud.dev/articles/en/demonstration-theoreme-de-cantor/" target="_blank" rel="noopener">Robin’s proof</a>. It computes <code>X = {b, c}</code> for the article’s finite map and checks that no element maps to X. In Sets, select E and X to inspect them.</p>
<p>For the general proof, take any map f from E to its power set and define <code>X = {e ∈ E : e ∉ f(e)}</code>. If f were surjective, some y in E would satisfy f(y) = X. Then <code>y ∈ X ⇔ y ∉ f(y) ⇔ y ∉ X</code>, a contradiction. Thus no such map is surjective or bijective. The injection <code>e ↦ {e}</code> gives the strict cardinality inequality.</p>
<p>ISETL evaluates finite constructions and checks. Its <code>forall</code> iterates over a supplied collection; it does not certify a proof for arbitrary or infinite sets.</p></section>
<p><strong>Editor shortcuts.</strong> ⌘/Ctrl + Enter runs a selection or the whole file. ⌘/Ctrl + Shift + Enter always runs the whole file. Tab indents. ⌘/Ctrl + F searches. The console keeps variables between runs; Reset starts a fresh session. Stop terminates a running program. Open and download .stl files to move your work between computers.</p>
<p><strong>Original manuals:</strong> <a href="manuals/ISETL1.txt" target="_blank">Part 1</a> · <a href="manuals/ISETL2.txt" target="_blank">Part 2</a> · <a href="manuals/ISETL3.txt" target="_blank">Part 3</a></p>`;
export const about = `
<div class="eyebrow">ABOUT</div><h2>ISETL Web</h2>
<p>ISETL was developed by Gary Levin for teaching discrete mathematics. This project keeps the language alive on the web, bringing the original C interpreter to the browser through WebAssembly.</p>
<p>The language is still ISETL: sets, tuples, relations, higher-order functions, arbitrary-size integers, and optional rational arithmetic. The editor and canvas are new.</p>
<p>Everything runs on your device. Your workspace is saved in this browser’s local storage. Files created by a program live in its session; download any you want to keep before resetting. There is no execution server and no account to create.</p>
<p>The portable interpreter is the archived ISETL source, not the Windows-only ISETLW executable. OS shell commands and native window controls are unavailable. Graphics use a 960 × 640 canvas. The original plotting libraries are included; move over the canvas and press keys to use their interactive controls.</p>
<div class="credit-card"><strong>Credits</strong><p>Original interpreter © Gary Levin, 1986–1990. Developed at Clarkson University. Plotting library contributions include Don Muench. Historical source and attribution remain in the repository. The original manual permits copying subject to a restriction against sale for profit; the new web code is MIT licensed.</p></div>
<p><a href="https://github.com/RobinPourtaud/ISETL" target="_blank" rel="noopener">Source code &amp; issues</a></p>`;
