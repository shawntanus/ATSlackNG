
import { performance } from 'perf_hooks';

const allFilter = [{field: "Id", op: "gte", value: 0}];

export const companies = new Map();
export const resources = new Map();
export const ticketStatus = new Map();
export const ticketQueues = new Map();
export const categories = new Map();

export const init = async(api) => {
    let begin = performance.now()
    console.log('Autotask Cache is loading... ');
    await Promise.all([getTicketStatus(api), getCompanies(api), getResources(api), getCategories(api), getTicketQueues(api)]);
    console.log(`Autotask Cache loaded in: ${performance.now() - begin} milliseconds`);
}

const getTicketStatus = async(api) => {
    let fieldInfo = await api.Tickets.fieldInfo();
    let statusInfoArray = fieldInfo.fields.filter(x => x.name == 'status');
    if (statusInfoArray.length < 1)
        throw new Exception("status cannot be found in fieldInfo from Ticket");
    
    statusInfoArray[0].picklistValues.forEach(x => {
        ticketStatus[x.value] = x.label;
    });
}

const getTicketQueues = async(api) => {
    let fieldInfo = await api.Tickets.fieldInfo();
    let queueInfoArray = fieldInfo.fields.filter(x => x.name == 'queueID');
    if (queueInfoArray.length < 1)
        throw new Exception("status cannot be found in queueID from Ticket");
    
    queueInfoArray[0].picklistValues.forEach(x => {
        ticketQueues[x.value] = x.label;
    });
}

const getCompanies = async(api) => {
    let companylist = await api.Companies.query({filter: allFilter});
    companylist.items.forEach(x => {
        companies[x.id] = x.companyName;
    });
}

const getResources = async(api) => {
    let resourcelist = await api.Resources.query({filter: allFilter});
    resourcelist.items.forEach(x => {
        resources[x.id] = x.userName;
    });
}

const getCategories = async(api) => {
    let list = await api.TicketCategories.query({filter: allFilter});
    list.items.forEach(x => {
        categories[x.id] = x.name;
    });
}
