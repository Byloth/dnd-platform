<script lang="ts" setup>
    import type { PropType } from "vue";

    import type { SectionTree } from "@byloth/dnd-platform-composer";

    defineProps({
        tree: {
            required: true,
            type: Object as PropType<SectionTree>
        }
    });
</script>

<template>
    <div class="sheet-tree">
        <section v-for="section in tree.sections.filter((s) => s.blocks.length > 0)"
                 :id="`section-${section.id}`"
                 :key="section.id"
                 :aria-labelledby="section.title ? `title-${section.id}` : undefined"
                 class="sheet-section">
            <h2 v-if="section.title" :id="`title-${section.id}`">
                {{ section.title }}
            </h2>
            <template v-for="(block, index) in section.blocks" :key="index">
                <div v-if="block.kind === 'identity'" class="identity">
                    <h1>{{ block.name }}</h1>
                    <p>{{ block.parts.join(" · ") }} — level {{ block.level }}</p>
                    <p class="text-muted">
                        Ruleset {{ block.ruleset }} · packages
                        {{ block.packages.map((p) => `${p.id} ${p.version}`).join(", ") }}
                    </p>
                </div>
                <dl v-else-if="block.kind === 'values'" class="values">
                    <template v-for="item in block.items" :key="item.id">
                        <dt>{{ item.label }}</dt>
                        <dd>
                            <strong :aria-label="`${item.label}, ${item.shown}`">{{ item.shown }}</strong>
                            <ul v-if="item.explain" class="explain">
                                <li v-for="(line, i) in item.explain.regular" :key="i">
                                    <code>{{ line.shown }}</code> {{ line.label }}
                                    <small class="text-muted">← {{ line.source }}</small>
                                </li>
                            </ul>
                        </dd>
                    </template>
                </dl>
                <table v-else-if="block.kind === 'abilities'" class="table table-sm">
                    <thead>
                        <tr>
                            <th scope="col">
                                Ability
                            </th>
                            <th scope="col">
                                Score
                            </th>
                            <th scope="col">
                                Mod
                            </th>
                            <th scope="col">
                                Save
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="row in block.rows" :key="row.id">
                            <th scope="row">
                                {{ row.name }}
                            </th>
                            <td>{{ row.score }}</td>
                            <td>{{ row.modifier }}</td>
                            <td>{{ row.save }} <span v-if="row.proficient">(proficient)</span></td>
                        </tr>
                    </tbody>
                </table>
                <div v-else-if="block.kind === 'skills'">
                    <table class="table table-sm">
                        <thead>
                            <tr>
                                <th scope="col">
                                    Skill
                                </th>
                                <th scope="col">
                                    Bonus
                                </th>
                                <th scope="col">
                                    Training
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="row in block.rows" :key="row.id">
                                <th scope="row">
                                    {{ row.name }} ({{ row.ability }})
                                </th>
                                <td>{{ row.bonus }}</td>
                                <td>{{ row.mark }}</td>
                            </tr>
                        </tbody>
                    </table>
                    <dl v-if="block.proficiencies.length > 0">
                        <template v-for="group in block.proficiencies" :key="group.type">
                            <dt>{{ group.label }}</dt>
                            <dd>{{ group.items.join(", ") }}</dd>
                        </template>
                    </dl>
                </div>
                <p v-else-if="block.kind === 'text'">
                    {{ block.items.join(" · ") }}
                </p>
                <dl v-else-if="block.kind === 'pairs'">
                    <template v-for="(row, i) in block.rows" :key="i">
                        <dt>{{ row.label }}</dt>
                        <dd>{{ row.text }}</dd>
                    </template>
                </dl>
                <table v-else-if="block.kind === 'attacks'" class="table table-sm">
                    <thead>
                        <tr>
                            <th scope="col">
                                Attack
                            </th>
                            <th scope="col">
                                To hit
                            </th>
                            <th scope="col">
                                Damage
                            </th>
                            <th scope="col">
                                Notes
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="row in block.rows" :key="row.id">
                            <th scope="row">
                                {{ row.name }}
                            </th>
                            <td>{{ row.toHit }}</td>
                            <td>{{ row.damage }}</td>
                            <td>{{ row.notes.join(", ") }}</td>
                        </tr>
                    </tbody>
                </table>
                <div v-else-if="block.kind === 'actions'">
                    <div v-for="group in block.groups" :key="group.activation">
                        <h3>{{ group.label }}</h3>
                        <ul>
                            <li v-for="item in group.items"
                                :key="item.id"
                                :class="{ 'text-muted': !item.available }">
                                <strong>{{ item.name }}</strong>
                                <span v-if="item.cost"> ({{ item.cost }})</span>
                                <span v-if="item.details.length > 0"> · {{ item.details.join(" · ") }}</span>
                            </li>
                        </ul>
                    </div>
                    <p v-if="block.base.length > 0" class="text-muted">
                        Base actions: {{ block.base.map((a) => a.name).join(", ") }}
                    </p>
                </div>
                <ul v-else-if="block.kind === 'resources'">
                    <li v-for="item in block.items" :key="item.id">
                        <strong>{{ item.name }}</strong>
                        <span :aria-label="`${item.current ?? '—'} of ${item.shownMax} ${item.name}`">
                            {{ item.current ?? "—" }} / {{ item.shownMax }}
                        </span>
                        <small v-if="item.recharge" class="text-muted"> {{ item.recharge }}</small>
                    </li>
                </ul>
                <div v-else-if="block.kind === 'spellcasting'">
                    <div v-for="caster in block.casters" :key="caster.id">
                        <h3>{{ caster.name }} — {{ caster.ability }}</h3>
                        <p>{{ caster.parts.join(" · ") }}</p>
                        <p v-if="caster.known.length > 0" class="text-muted">
                            {{ caster.known.join(", ") }}
                        </p>
                        <ul v-if="caster.slots.length > 0">
                            <li v-for="slot in caster.slots" :key="slot.label">
                                {{ slot.label }}: {{ slot.current }} / {{ slot.max }}
                            </li>
                        </ul>
                    </div>
                </div>
                <dl v-else-if="block.kind === 'spells'">
                    <template v-for="level in block.levels" :key="level.level">
                        <dt>{{ level.label }}</dt>
                        <dd>{{ level.items.map((s) => s.label).join(", ") }}</dd>
                    </template>
                </dl>
                <div v-else-if="block.kind === 'features'">
                    <div v-for="group in block.groups" :key="group.origin">
                        <h3>{{ group.label }}</h3>
                        <dl>
                            <template v-for="item in group.items" :key="item.id">
                                <dt>
                                    {{ item.name }}
                                    <small v-if="item.level !== undefined" class="text-muted">L{{ item.level }}</small>
                                </dt>
                                <dd>{{ item.text }}</dd>
                            </template>
                        </dl>
                    </div>
                </div>
                <ul v-else-if="block.kind === 'equipment'">
                    <li v-for="item in block.items" :key="item.id">
                        {{ item.name }}<span v-if="item.quantity > 1"> ×{{ item.quantity }}</span>
                        <small v-if="item.flags.length > 0" class="text-muted"> ({{ item.flags.join(", ") }})</small>
                    </li>
                </ul>
                <dl v-else-if="block.kind === 'personality'">
                    <template v-for="field in block.fields" :key="field.label">
                        <dt>{{ field.label }}</dt>
                        <dd>{{ field.text }}</dd>
                    </template>
                </dl>
                <ul v-else-if="block.kind === 'conditions'">
                    <li v-for="(item, i) in block.items" :key="i">
                        {{ item }}
                    </li>
                </ul>
                <div v-else-if="block.kind === 'notes'">
                    <p v-if="block.text">
                        {{ block.text }}
                    </p>
                    <ul v-if="block.open.length > 0">
                        <li v-for="choice in block.open" :key="choice.key">
                            {{ choice.label }} <small class="text-muted">{{ choice.progress }}</small>
                        </li>
                    </ul>
                </div>
                <ul v-else-if="block.kind === 'reminders'" class="reminders">
                    <li v-for="(item, i) in block.items" :key="i">
                        {{ item.text }} <small class="text-muted">— {{ item.source }}</small>
                    </li>
                </ul>
                <div v-else-if="block.kind === 'credits'">
                    <div v-for="pkg in block.packages" :key="pkg.id">
                        <h3>{{ pkg.name }} <small class="text-muted">({{ pkg.id }} {{ pkg.version }})</small></h3>
                        <p v-for="source in pkg.sources"
                           :key="source.title"
                           class="text-muted">
                            {{ source.line }}
                        </p>
                    </div>
                </div>
            </template>
        </section>
        <section v-if="tree.warnings.length > 0"
                 id="section-warnings"
                 aria-labelledby="title-warnings"
                 class="sheet-section">
            <h2 id="title-warnings">
                Warnings
            </h2>
            <ul>
                <li v-for="(warning, i) in tree.warnings" :key="i">
                    <code>{{ warning.code }}</code> {{ warning.message }}
                </li>
            </ul>
        </section>
    </div>
</template>

<style lang="scss" scoped>
    .sheet-tree
    {
        text-align: left;

        .sheet-section
        {
            margin-bottom: 2em;
        }
        .explain
        {
            font-size: 0.875em;
            list-style: none;
            padding-left: 0;
        }
    }
</style>
