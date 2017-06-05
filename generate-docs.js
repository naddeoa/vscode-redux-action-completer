#!/usr/bin/env node
// Helper script to convert the properties to markdown for the readme.

const packageJson = require("./package.json");
const properties = packageJson.contributes.configuration.properties;

function renderSection({ name, type, defaultValue = "undefined", description }) {
    return `\`${name}\`: ${type} (defaults to ${JSON.stringify(defaultValue)}) - ${description}\n`;
}

console.log("## Commands\n");
packageJson.contributes.commands.forEach( ({command, title, description}) => {
    console.log(`\`${command}\`: ${title} - ${description}`);
})
console.log("\n");

console.log("## Configuration options\n");
Object.keys(properties).forEach((name) => {
    const property = properties[name];
    console.log(renderSection({
        name,
        type: property.type,
        defaultValue: property.default || "undefined",
        description: property.description
    }));
});