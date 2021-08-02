import { AutotaskRestApi } from '@apigrate/autotask-restapi';
import { autotask as config } from '../config.js';
import { performance } from 'perf_hooks';

import * as autotask_cache from './autotask_cache.js';

const autotask = new AutotaskRestApi(
    config.username,
    config.password,
    config.integrationkey
);

const api = await autotask.api();
await autotask_cache.init(api);

export const getTicketByID = async (ticketID) => {
    let begin = performance.now()
    let ticketResponse = await api.Tickets.get(ticketID);
    console.log(`getTicketByID request: ${performance.now() - begin} milliseconds`);
    let ticket = ticketResponse.item;

    return createSlackTicketObj(ticket);
};

export const getTicketByNumber = async (ticketNumber) => {
    let ticketResponse = await api.Tickets.query({
        filter: [{field: "TicketNumber", op: "eq", value: ticketNumber}]
    });
    let ticket = ticketResponse.items[0];
    
    return createSlackTicketObj(ticket);
};

export const completeTicketByID = async (ticketID) => {
    let ticketResponse = await api.Tickets.get(ticketID);
    let ticket = ticketResponse.item;

    let completeStatus = Object.keys(ticketStatus).find(key => ticketStatus[key] == 'Complete');
    if(completeStatus>0){
        ticket.status = completeStatus[0];
        console.log("Completing ticket: " + ticketID);
        api.Tickets.update(ticket);
    }
};

export const assignTicketByID = async ({ticketid, username}) =>{
    console.log(`assigning ticket ${ticketid} to ${username}`);
    let ticketResponse = await api.Tickets.get(ticketid);
    let ticket = ticketResponse.item;
    let resourceid = Object.keys(autotask_cache.resources).find(key => autotask_cache.resources[key] == username);
    if(resourceid >0){
        ticket.assignedResourceID = resourceid;
        console.log(`updating ticket ${ticketid} to resourceid: ${resourceid} (${autotask_cache.resources[resourceid]})`);
        api.Tickets.update(ticket);
    }
};

const createSlackTicketObj = (ticket) => {
    return {
        id: ticket.id,
        assignedResource: autotask_cache.resources[ticket.assignedResourceID],
        company: autotask_cache.companies[ticket.companyID],
        status: autotask_cache.ticketStatus[ticket.status],
        title: ticket.title,
        ticketNumber: ticket.ticketNumber,
        queue: autotask_cache.ticketQueues[ticket.queueID],
        category: autotask_cache.categories[ticket.ticketCategory],
        description: ticket.description,
        url: "https://ww5.autotask.net/Autotask/AutotaskExtend/ExecuteCommand.aspx?Code=OpenTicketDetail&TicketID=" + ticket.id,
    };
}