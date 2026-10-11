import type { Variable } from "@isetl/runtime";
import { combineSets, type SetOperation } from "./set-model";

export function createSetView(parent: HTMLElement, openExample: () => void) {
  parent.innerHTML = `<div class="sets-empty"><h2>Set inspector</h2><p>Run code that assigns sets to variables.</p><pre>A := {1, 2, 3};\nB := {2, 3, 4};</pre><button class="text-button" id="set-example">Open sets example</button></div>
  <div class="sets-content" hidden>
    <div class="set-heading"><strong>Set operations</strong><span id="snapshot-status">Values from the last run</span></div>
    <div class="set-selectors"><label>Left set <select id="set-a"></select></label><label>Right set <select id="set-b"></select></label></div>
    <div class="set-operations" role="group" aria-label="Set operation">
      <button data-op="union" aria-pressed="true">Union <code>+</code></button><button data-op="intersection" aria-pressed="false">Intersection <code>*</code></button><button data-op="difference" aria-pressed="false">Difference <code>−</code></button><button data-op="symmetric" aria-pressed="false">Symmetric <code>△</code></button>
    </div>
    <p id="set-limit" hidden>Preview limited to 80 members per set. Use the console for operations on larger sets.</p>
    <div id="set-visual">
      <svg class="venn" viewBox="0 0 480 225" role="img" aria-labelledby="venn-title"><title id="venn-title">Set membership</title>
        <defs><clipPath id="left-circle"><circle cx="185" cy="110" r="92"/></clipPath><clipPath id="right-circle"><circle cx="295" cy="110" r="92"/></clipPath><mask id="without-right"><rect width="480" height="225" fill="white"/><circle cx="295" cy="110" r="92" fill="black"/></mask><mask id="without-left"><rect width="480" height="225" fill="white"/><circle cx="185" cy="110" r="92" fill="black"/></mask></defs>
        <circle class="venn-region" data-region="0" cx="185" cy="110" r="92" mask="url(#without-right)"/>
        <circle class="venn-region" data-region="2" cx="295" cy="110" r="92" mask="url(#without-left)"/>
        <g clip-path="url(#left-circle)"><circle class="venn-region" data-region="1" cx="295" cy="110" r="92"/></g>
        <circle class="venn-outline" cx="185" cy="110" r="92"/><circle class="venn-outline" cx="295" cy="110" r="92"/>
        <text x="142" y="112" id="venn-left"/><text x="240" y="112" id="venn-both"/><text x="338" y="112" id="venn-right"/>
        <text x="140" y="220" id="venn-a"/><text x="340" y="220" id="venn-b"/>
      </svg>
      <div class="region-lists"></div>
      <div class="set-result"><div><code id="set-expression"></code><span id="set-count"></span></div><div id="set-result-members" class="member-list" aria-live="polite"></div></div>
      <div class="animation-controls"><button id="set-play" class="text-button">Animate</button><input id="set-step" aria-label="Set operation animation step" type="range" min="0" max="3" value="3"><span id="set-step-label">3 / 3 regions</span></div>
    </div>
  </div>
  <details class="variables" open><summary>Variables <span id="variable-count">0</span></summary><div class="variable-scroll"><table><thead><tr><th>Name</th><th>Type</th><th>Value</th></tr></thead><tbody></tbody></table></div><p class="inspection-note">Updated after each completed run. Up to 128 variables; collections show up to 80 members.</p></details>`;
  const query = <T extends HTMLElement>(selector: string) =>
    parent.querySelector<T>(selector)!;
  const left = query<HTMLSelectElement>("#set-a"),
    right = query<HTMLSelectElement>("#set-b");
  const slider = query<HTMLInputElement>("#set-step");
  let variables: Variable[] = [],
    operation: SetOperation = "union";
  let timer: ReturnType<typeof setInterval> | undefined;
  const pause = () => {
    clearInterval(timer);
    timer = undefined;
    query("#set-play").textContent = "Animate";
  };
  const chips = (
    target: HTMLElement,
    items: Variable["value"][],
    included = true,
  ) => {
    target.replaceChildren();
    for (const item of items) {
      const chip = document.createElement("code");
      chip.className = "member" + (included ? " included" : "");
      chip.textContent = item.label.trim();
      chip.title = item.label.trim();
      target.append(chip);
    }
    if (!items.length) target.textContent = "∅";
  };
  function render() {
    const a = variables.find((v) => v.name === left.value),
      b = variables.find((v) => v.name === right.value);
    if (!a || !b) return;
    const truncated = a.value.truncated || b.value.truncated;
    query("#set-limit").hidden = !truncated;
    query("#set-visual").hidden = truncated;
    if (truncated) {
      pause();
      return;
    }
    const { regions, included, result } = combineSets(a, b, operation);
    const step = Number(slider.value);
    const names = [`${a.name} only`, "Both", `${b.name} only`];
    const lists = query(".region-lists");
    lists.replaceChildren();
    regions.forEach((items, index) => {
      const region = document.createElement("section");
      region.className =
        "region" + (included[index] && index < step ? " selected-region" : "");
      const heading = document.createElement("h3");
      heading.textContent = names[index] + " · " + items.length;
      const members = document.createElement("div");
      members.className = "member-list";
      chips(members, items, included[index] && index < step);
      region.append(heading, members);
      lists.append(region);
      parent
        .querySelector(`[data-region="${index}"]`)!
        .classList.toggle("included", included[index] && index < step);
    });
    ["left", "both", "right"].forEach(
      (name, i) =>
        (query("#venn-" + name).textContent = String(regions[i].length)),
    );
    query("#venn-a").textContent = `${a.name} (${a.value.size})`;
    query("#venn-b").textContent = `${b.name} (${b.value.size})`;
    query("#venn-title").textContent =
      `${a.name} only: ${regions[0].length}; both: ${regions[1].length}; ${b.name} only: ${regions[2].length}`;
    query("#set-expression").textContent =
      operation === "symmetric"
        ? `(${a.name} - ${b.name}) + (${b.name} - ${a.name})`
        : `${a.name} ${{ union: "+", intersection: "*", difference: "-" }[operation]} ${b.name}`;
    const visible = regions.flatMap((items, i) =>
      included[i] && i < step ? items : [],
    );
    chips(query("#set-result-members"), visible);
    query("#set-count").textContent =
      `${visible.length} / ${result.length} members`;
    query("#set-step-label").textContent = `${step} / 3 regions`;
  }
  function restart() {
    pause();
    slider.value = "3";
    render();
  }
  left.onchange = right.onchange = restart;
  slider.oninput = () => {
    pause();
    render();
  };
  query("#set-play").onclick = () => {
    if (timer) {
      pause();
      return;
    }
    slider.value = "0";
    render();
    query("#set-play").textContent = "Pause";
    timer = setInterval(() => {
      slider.value = String(Number(slider.value) + 1);
      render();
      if (slider.value === "3") pause();
    }, 750);
  };
  parent.querySelectorAll<HTMLButtonElement>("[data-op]").forEach((button) => {
    button.onclick = () => {
      operation = button.dataset.op as SetOperation;
      parent
        .querySelectorAll("[data-op]")
        .forEach((item) =>
          item.setAttribute("aria-pressed", String(item === button)),
        );
      restart();
    };
  });
  query("#set-example").onclick = openExample;
  return {
    pause,
    update(next: Variable[]) {
      pause();
      variables = next;
      const sets = variables.filter((v) => v.value.type === "set");
      query(".sets-empty").hidden = sets.length > 0;
      query(".sets-content").hidden = sets.length === 0;
      for (const [index, select] of [left, right].entries()) {
        const previous = select.value;
        select.replaceChildren();
        for (const variable of sets)
          select.add(
            new Option(
              `${variable.name} · ${variable.value.size}`,
              variable.name,
            ),
          );
        select.value = sets.some((v) => v.name === previous)
          ? previous
          : (sets.find((v) => v.name === (index ? "B" : "A"))?.name ??
            sets[Math.min(index, sets.length - 1)]?.name ??
            "");
      }
      query("#variable-count").textContent = String(variables.length);
      const body = query("tbody");
      body.replaceChildren();
      for (const variable of variables) {
        const row = document.createElement("tr");
        for (const text of [
          variable.name,
          variable.value.type,
          variable.value.label.trim() +
            (variable.value.truncated &&
            !["set", "tuple"].includes(variable.value.type)
              ? "…"
              : ""),
        ]) {
          const cell = document.createElement("td");
          cell.textContent = text;
          row.append(cell);
        }
        body.append(row);
      }
      slider.value = "3";
      render();
    },
  };
}
