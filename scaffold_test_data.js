const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, 'Engine_Room_Docs');

const structure = {
    '01_Manuals_and_Drawings': {
        'Main_Engine': ['MAN_B&W_Operation_Manual.pdf', 'ME_Cylinder_Liner_Schematic.pdf'],
        'Generators': ['Daihatsu_Aux_Engine_Manual.pdf', 'Generator_Troubleshooting.pdf'],
        'Purifiers': ['Alfa_Laval_Separator_Manual.pdf', 'Purifier_Spare_Parts_List.pdf'],
        'Pumps': ['Centrifugal_Pump_Manual.pdf']
    },
    '02_Maintenance_Records': {
        'Daily_Soundings': ['Soundings_2024_04_20.xlsx', 'Soundings_2024_04_21.xlsx'],
        'Monthly_Reports': ['Monthly_Performance_March.pdf']
    },
    '03_Safety_Management_System': {
        'Risk_Assessments': ['RA_001_Enclosed_Space_Entry.pdf', 'RA_002_Hot_Work.pdf'],
        'Permits_to_Work': ['Hot_Work_Permit_Template.docx'],
        'Emergency_Procedures': ['Fire_in_Engine_Room.pdf', 'Blackout_Procedure.pdf']
    },
    '04_Spare_Parts': {
        'Requisitions': ['Req_045_ME_Valves.pdf'],
        'Inventory': ['Current_Stock_List.xlsx']
    }
};

function createStructure(basePath, struct) {
    if (!fs.existsSync(basePath)) {
        fs.mkdirSync(basePath, { recursive: true });
    }
    
    for (const key in struct) {
        const currentPath = path.join(basePath, key);
        
        if (Array.isArray(struct[key])) {
            // It's a directory containing files
            if (!fs.existsSync(currentPath)) {
                fs.mkdirSync(currentPath);
            }
            struct[key].forEach(file => {
                const filePath = path.join(currentPath, file);
                fs.writeFileSync(filePath, 'Dummy file content for ERCC testing.');
            });
        } else {
            // It's a directory containing other directories
            createStructure(currentPath, struct[key]);
        }
    }
}

console.log('Scaffolding Engine Room test data...');
createStructure(rootDir, structure);
console.log('Done! Created structure in:', rootDir);
