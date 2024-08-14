const cds = require("@sap/cds");
const { assert } = require("console");
const complexkeys = require("path").resolve(__dirname, "./complex-keys/");
const { expect, data, POST, GET } = cds.test(complexkeys);

let service = null;
let ChangeView = null;
let db = null;
let ChangeEntity = null;

describe("change log with complex keys", () => {
    beforeAll(async () => {
        service = await cds.connect.to("complexkeys.ComplexKeys");
        ChangeView = service.entities.ChangeView;
        db = await cds.connect.to("sql:my.db");
        ChangeEntity = db.model.definitions["sap.changelog.Changes"];
    });

    beforeEach(async () => {
        await data.reset();
    });

    it("logs many-to-many composition with complex keys correctly", async () => {

        const root = await POST(`/complex-keys/Root`, {
            name: "Root"
        });
        expect(root.status).to.equal(201)

        const linked1 = await POST(`/complex-keys/Linked`, {
            name: "Linked 1"
        });
        expect(linked1.status).to.equal(201)

        const linked2 = await POST(`/complex-keys/Linked`, {
            name: "Linked 2"
        });
        expect(linked2.status).to.equal(201)

        const link1 = await POST(`/complex-keys/Root(ID=${root.data.ID},IsActiveEntity=false)/links`, {
            linked_ID: linked1.data.ID,
            root_ID: root.ID
        });
        expect(link1.status).to.equal(201)

        const link2 = await POST(`/complex-keys/Root(ID=${root.data.ID},IsActiveEntity=false)/links`, {
            linked_ID: linked2.data.ID,
            root_ID: root.ID
        });
        expect(link2.status).to.equal(201)

        const save = await POST(`/complex-keys/Root(ID=${root.data.ID},IsActiveEntity=false)/complexkeys.ComplexKeys.draftActivate`, { preserveChanges: false })
        expect(save.status).to.equal(201)


        const changes = await service.run(SELECT.from(ChangeView));
        expect(changes).to.have.length(3);
        expect(changes.map(change => ({
            modification: change.modification,
            attribute: change.attribute,
            valueChangedTo: change.valueChangedTo,
        }))).to.have.deep.members([
            {
                attribute: 'name',
                modification: 'Create',
                valueChangedTo:
                    'Root'
            }, {
                attribute: 'links',
                modification: 'Create',
                valueChangedTo:
                    'Linked 1'
            }, {
                attribute: 'links',
                modification: 'Create',
                valueChangedTo:
                    'Linked 2'
            }])
    })
});