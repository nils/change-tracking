const cds = require("@sap/cds");
const LOG = cds.log("change-log");
const { getEntity, getNameFromPathVal, getDBEntityName } = require("./entity-helper");
const { OBJECT_PATH_DELIMITER } = require("./constants");
const OBJECT_TYPE_I18N_LABEL_KEY = "@Common.Label"

const MODIF_I18N_MAP = {
    create: "{i18n>ChangeLog.modification.create}",
    update: "{i18n>ChangeLog.modification.update}",
    delete: "{i18n>ChangeLog.modification.delete}",
};

const _getLocalization = function (locale, i18nKey) {
    return JSON.parse(cds.localize(cds.model, locale, JSON.stringify(i18nKey)));
};

const _localizeModification = function (change, locale) {
    if (change.modification && MODIF_I18N_MAP[change.modification]) {
        change.modification = _getLocalization(locale, MODIF_I18N_MAP[change.modification]);
    }
};

const _localizeDefaultObjectID = function (change, locale) {
    if (!change.objectID) {
        change.objectID = change.entity ? change.entity : "";
    }
    if (change.objectID && change.serviceEntityPath && !change.parentObjectID && change.parentKey) {
        const path = change.serviceEntityPath.split(OBJECT_PATH_DELIMITER);
        const parentNodePathVal = path[path.length - 2];
        const parentEntityName = getNameFromPathVal(parentNodePathVal);
        const dbParentEntityName = getDBEntityName(parentEntityName);
        const parentEntity = getEntity(dbParentEntityName);
        try {
            const labelI18nKey = parentEntity[OBJECT_TYPE_I18N_LABEL_KEY];
            const labelI18nValue = labelI18nKey ? _getLocalization(locale, labelI18nKey) : null;

            change.parentObjectID = labelI18nValue ? labelI18nValue : dbParentEntityName;
        } catch (e) {
            LOG.error("Failed to localize parent object id", e);
            throw new Error("Failed to localize parent object id", e);
        }
    }
};

const _localizeEntityType = function (change, locale) {
    if (change.entity) {
        try {
            const labelI18nKey = _getLabelI18nKeyOnEntity(change.entity);
            const labelI18nValue = labelI18nKey ? _getLocalization(locale, labelI18nKey) : null;

            change.entity = labelI18nValue ? labelI18nValue : change.entity;
        } catch (e) {
            LOG.error("Failed to localize entity type", e);
            throw new Error("Failed to localize entity type", e);
        }
    }
    if (change.serviceEntity) {
        try {
            const labelI18nKey = _getLabelI18nKeyOnEntity(change.serviceEntity);
            const labelI18nValue = labelI18nKey ? _getLocalization(locale, labelI18nKey) : null;

            change.serviceEntity = labelI18nValue ? labelI18nValue : change.serviceEntity;
        } catch (e) {
            LOG.error("Failed to localize service entity", e);
            throw new Error("Failed to localize service entity", e);
        }
    }
};

const _localizeAttribute = function (change, locale) {
    if (change.attribute && change.serviceEntity) {
        try {
            const serviceEntity = getEntity(change.serviceEntity);
            let labelI18nKey = _getLabelI18nKeyOnEntity(change.serviceEntity, change.attribute);
            const element = serviceEntity.elements[change.attribute];
            if (element.isAssociation && !labelI18nKey) {
                labelI18nKey = _getLabelI18nKeyOnEntity(element.target);
            }
            const labelI18nValue = labelI18nKey ? _getLocalization(locale, labelI18nKey) : null;

            change.attribute = labelI18nValue ? labelI18nValue : change.attribute;
        } catch (e) {
            LOG.error("Failed to localize change attribute", e);
            throw new Error("Failed to localize change attribute", e);
        }
    }
};

const _getLabelI18nKeyOnEntity = function (entityName, /** optinal */ attribute) {
    const entity = getEntity(entityName);
    if (!entity) {
        return "";
    }
    if (attribute) {
        const element = entity.elements[attribute] ? entity.elements[attribute] : {};
        return element[OBJECT_TYPE_I18N_LABEL_KEY];
    }
    return entity[OBJECT_TYPE_I18N_LABEL_KEY];
};

const localizeLogFields = function (data, locale) {
    if (!locale) {
        return;
    }

    for (const change of data) {
        _localizeModification(change, locale);
        _localizeAttribute(change, locale);
        _localizeEntityType(change, locale);
        _localizeDefaultObjectID(change, locale);
    }
};
module.exports = {
    localizeLogFields,
};