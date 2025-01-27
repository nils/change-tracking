function getKey(entity, data) {
    const result = {};
    if (entity && entity.keys) {
        for (let [key, def] of Object.entries(entity.keys)) {
            if (!def.virtual && !def.isAssociation) {
                result[key] = data[key];
            }
        }    
    }
    return result;
}

const stringifyPath = (path) => {
    const isSingleKeyPath = path.every((pathElement) => Object.keys(pathElement.key).length === 1);
    if(isSingleKeyPath) {
        // for backwards compatibility, if all keys are simple, store in the former format
        return path.map((pathElement) => {
            return `${pathElement.target}(${stringifyKey(pathElement.key)})`
        }).join("/")
    }
    return JSON.stringify(path);
}

const parsePath = (path) => {
    try {
        return JSON.parse(path);
    } catch(e) {
        const getTarget = (pathElement) => {
            return pathElement.match(/(.*)\((.*)\)/)[1]
        }
        return path.split("/").map((pathElement) => ({
            target: getTarget(pathElement)
        }));
    }
}

const stringifyKey = (k) => {
    if (!k) return k;
    if (Object.entries(k).length == 1) {
        // for backwards compatibility, a single key is persisted as only the value instead of a JSON object
        return Object.values(k)[0];
    }

    return k;
}

const resolveToSourceFields = (ref, assoc) => {
    if (ref[0] == assoc.name) {
        return null;
    }
    if (ref[0] == "$self") {
        return Object.values(assoc.parent.keys).filter(k => !k.virtual).map(k => k.name)
    }
    return ref;
}

const resolveToTargetFields = (ref, assoc) => {
    ref = [...ref];
    if (ref[0] !== assoc.name) {
        return null;
    }
    ref.shift()
    const elem = assoc._target.elements[ref[0]];
    if (elem.isAssociation) {
        return elem.keys.map(k => k.$generatedFieldName);
    }
    return ref;
}

const getAssociationKey = (assoc, data) => {
    try {
        if (assoc.keys) {
            return assoc.keys.reduce((a, key) => {
                let targetField = key.ref[0];
                let sourceField = key.$generatedFieldName;
                if (!data[sourceField]) {
                    throw Error('incomplete data')
                }
                a[targetField] = data[sourceField];
                return a;
            }, {})
        }
        else if (assoc.on) {
            return assoc.on.reduce((a, on, i) => {
                if (on == '=') {
                    const left = assoc.on[i - 1]
                    const right = assoc.on[i + 1]
                    const sourceFields = resolveToSourceFields(left.ref, assoc) ?? resolveToSourceFields(right.ref, assoc);
                    const targetFields = resolveToTargetFields(left.ref, assoc) ?? resolveToTargetFields(right.ref, assoc);

                    sourceFields.forEach((sourceField, i) => {
                        const targetField = targetFields[i];
                        if (!data[sourceField]) {
                            throw Error('incomplete data')
                        }
                        a[targetField] = data[sourceField];
                    })
                }
                return a;
            }, {})
        }
    } catch (e) {
        return undefined;
    }
}

module.exports = {
    getKey,
    getAssociationKey,
    stringifyKey,
    stringifyPath,
    parsePath,
}