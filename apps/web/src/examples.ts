export interface Example {
  id: string;
  title: string;
  description: string;
  icon: string;
  source: string;
}
export const examples: Example[] = [
  {
    id: "playground",
    title: "Sets & comprehensions",
    description: "Union, intersection, difference, and comprehensions.",
    icon: "braces",
    source: `$ Run this file, then open the Sets tab.

numbers := {1..12};
squares := {n * n : n in numbers};
even_squares := {s : s in squares | s mod 2 = 0};

print even_squares;

$ Set operations.
A := {1, 2, 3, 4};
B := {3, 4, 5, 6};

A + B;    $ Union
A * B;    $ Intersection
A - B;    $ Difference

#even_squares;    $ Cardinality
`,
  },
  {
    id: "relations",
    title: "Relations & maps",
    description: "A function can be a set of pairs.",
    icon: "network",
    source: `$ Relations are sets of ordered pairs.
square := {[n, n*n] : n in {1..6}};

square;
square(4);
domain(square);
image(square);

$ A relation can have more than one image.
likes := {["Ada", "sets"], ["Ada", "maps"],
          ["Emmy", "groups"]};
likes{"Ada"};

$ Quantifiers.
forall n in {1..6} | square(n) >= n;
exists n in {1..6} | square(n) = 25;
`,
  },
  {
    id: "cantor",
    title: "Cantor’s theorem",
    description: "Construct the missing subset from Robin’s proof.",
    icon: "braces",
    source: `$ Finite example from Robin's proof of Cantor's theorem.
E := {"a", "b", "c"};
f := {["a", {"a", "b"}], ["b", {}], ["c", {"a"}]};

X := {e : e in E | e notin f(e)};

writeln "Diagonal subset X (expected: b and c):";
X;

writeln "Rows: [e, e in f(e), e in X]";
[[e, e in f(e), e in X] : e in ["a", "b", "c"]];

writeln "X belongs to the power set of E:";
X in pow(E);

writeln "X differs from every f(e) at element e:";
forall e in E | (e in X) /= (e in f(e));

writeln "Does X have an antecedent under f?";
exists y in E | f(y) = X;

$ In Sets, choose E and X to inspect their members.
$ The general proof is in Reference; this checks one finite map.
`,
  },
  {
    id: "recursion",
    title: "Functions & recursion",
    description: "Recursion, higher-order functions, and exact arithmetic.",
    icon: "binary",
    source: `$ Functions are values, too.
factorial := func(n);
  if n = 0 then return 1; end;
  return n * factorial(n - 1);
end;

factorial(10);
factorial(50);    $ Integers grow as needed.

$ Pass a function to another function.
twice := func(f, x);
  return f(f(x));
end;
increment := func(x); return x + 1; end;
twice(increment, 40);

$ Exact fractions, without rounding.
!rational on
1/3 + 1/6;
!rational off
`,
  },
  {
    id: "primes",
    title: "Finding primes",
    description: "The sieve of Eratosthenes.",
    icon: "sparkles",
    source: `$ The sieve of Eratosthenes.
limit := 100;
primes := {2..limit};

for p in {2..fix(sqrt(limit))} do
  if p in primes then
    primes := primes - {p*k : k in {p..limit div p}};
  end;
end;

print "Primes up to 100:";
print primes;
print "Count:", #primes;

$ Twin primes differ by two.
{[p, p+2] : p in primes | p+2 in primes};
`,
  },
  {
    id: "input",
    title: "Console input",
    description: "Read a value from the console.",
    icon: "messages-square",
    source: `$ Run, then enter a number in the console.
writeln "Enter a number followed by a semicolon:";
read n;

print "Your number:", n;
print "Its square:", n*n;
print "Its divisors:", {d : d in {1..abs(n)} | n mod d = 0};

$ Try another number by running this file again.
`,
  },
  {
    id: "drawing",
    title: "Drawing",
    description: "Plot a sine curve using move and draw.",
    icon: "chart-spline",
    source: `$ The original graphics commands, on a canvas.
graphics(true);
scale(-7, 7, -1.7, 1.7);
title_window("Sine curve");

$ Draw the axes.
move(-7, 0); draw(7, 0);
move(0, -1.5); draw(0, 1.5);

thickline(true);
move(-6.28, sin(-6.28));
for i in [1..240] do
  x := -6.28 + i * 12.56 / 240;
  draw(x, sin(x));
end;
thickline(false);
textout(-6.5, 1.3, "y = sin(x)");

print "Rendered 240 segments.";
`,
  },
  {
    id: "files",
    title: "Reading & writing files",
    description: "Create and read files in the session filesystem.",
    icon: "file-text",
    source: `$ These files stay inside your browser session.
f := openw("squares.txt");
for n in [1..5] do
  print [n, n*n] to f;
end;
close(f);

$ Read back the first saved pair.
f := openr("squares.txt");
read pair from f;
close(f);
pair;

$ Open squares.txt under Session files to inspect it.
`,
  },
  {
    id: "plot",
    title: "The classic plotter",
    description: "Don Muench’s original interactive library.",
    icon: "scan",
    source: `$ The plotting library shipped with ISETLW.
!include donplot.stl

$ Move the pointer over the canvas and press a key.
$ c connects points; a autoscales; q finishes.
f := func(x); return sin(x); end;
plot(f, -7, 7, -2, 2);
`,
  },
];
