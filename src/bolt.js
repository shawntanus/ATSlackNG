import { slack as config } from './config.js';
import express from './express.js';
import * as bolt from '@slack/bolt';
import * as autotask from './lib/autotask.js';
import * as usermap from './lib/usermap.js';

const app = new bolt.default.App({
  socketMode: true,
  token: config.token,
  appToken: config.appToken,
});

app.action('assign_user-action', async ({ body, ack, client }) => {
  let userinfo = await client.users.info({user: body.actions[0].selected_user});
  let atuser = usermap.slack2at(userinfo.user.name);
  if(atuser){
    await ack();
    body.message.blocks[1].fields[3].text = '*Primary Resource:*\n@' + userinfo.user.name;
    client.chat.update({channel: body.channel.id, ts: body.message.ts, blocks: body.message.blocks, text: body.message.text});
    let slackUser = await client.users.info({user: body.actions[0].selected_user});
    autotask.assignTicketByID({ticketid: body.message.text, username: slackUser.user.name});
  }else{
    await ack({
      response_action: 'errors',
      errors: {
        field: 'user error'
      }
    });
  }
});

app.action('open_modal-action', async ({ body, ack, client }) => {
  let ticket = await autotask.getTicketByID(body.actions[0].value);
  let blocks = body.message.blocks;
  blocks.splice(3,2);

  // add description
  blocks.push({
    "type": "context",
    "elements": [
      {
        "type": "plain_text",
        "text": await ticket.description,
        "emoji": true
      }
    ]
  })

  // reply input
  blocks.push(
    {
    "dispatch_action": true,
    "type": "input",
    "element": {
      "type": "plain_text_input",
      "action_id": "plain_text_input-action"
    },
    "label": {
      "type": "plain_text",
      "text": "Reply to ticket",
      "emoji": false
    }
  })

  let view = {
    type: "modal",
    title: {
      type: "plain_text",
      text: "Autotask Ticket"
    },
    close: {
      type: "plain_text",
      text: "Close"
    },
    blocks: blocks
  };
  await ack();
  const result = await client.views.open({
    trigger_id: body.trigger_id,
    view: view
  });

});

app.action('close_ticket-action', async ({ body, ack, client }) => {
  await ack();
  client.chat.delete({channel: body.channel.id, ts: body.message.ts});
  autotask.completeTicketByID(body.actions[0].value);
});

app.message(/T2021\d{4}\.\d{4}/, async ({ message, say }) => {
  let match = message.text.match(/T2021\d{4}\.\d{4}/);
  if(match.length>0){
    await postTicketToSlack({ticketNumber: match[0], channel: message.channel, title: 'Mentioned Ticket'});
  }
});

express.get('/fire', async(req, resp) => {
  await postTicketToSlack({ticketid: 945727, channel: config.atslack_channel});
  resp.send('done');
});

const postTicketToSlack = async ({ticketid, ticketNumber, channel, title='New Ticket'}) => {
  let ticket = null;
  if(ticketid){
    console.log("Searching TicketID: " + ticketid);
    ticket = await autotask.getTicketByID(ticketid);
  }else if(ticketNumber){
    console.log("Searching TicketNumber: " + ticketNumber);
    ticket = await autotask.getTicketByNumber(ticketNumber);
  }

  if(!ticket)
    return;
  
  if(ticket.last_ts && ticket.last_channel){
    app.client.chat.delete({
      channel: ticket.last_channel,
      ts: ticket.last_ts
    });
  }
  console.log("Posting ticket id: " + ticket.id);

  let blocks = [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": `${title}:\n*<${ticket.url}|${ticket.title}>*`
      }
    },
    {
      "type": "section",
      "fields": [
        {
          "type": "mrkdwn",
          "text": `*TicketNumber:*\n<${ticket.url}|${ticket.ticketNumber}>`
        },
        {
          "type": "mrkdwn",
          "text": `*Status:*\n${ticket.status}`
        },
        {
          "type": "mrkdwn",
          "text": `*Company:*\n${ticket.company}`
        },
        {
          "type": "mrkdwn",
          "text": `*Primary Resource:*\n@${usermap.at2slack(ticket.assignedResource)}`
        },
        {
          "type": "mrkdwn",
          "text": `*Queue:*\n${ticket.queue}`
        },
        {
          "type": "mrkdwn",
          "text": `*Category:*\n${ticket.category}`
        }
      ]
    },
    {
			"type": "divider"
		},
    {
			"type": "section",
			"text": {
				"type": "mrkdwn",
				"text": "Assign ticket to user:"
			},
			"accessory": {
				"type": "users_select",
				"placeholder": {
					"type": "plain_text",
					"text": "Select a user",
					"emoji": true
				},
				"action_id": "assign_user-action"
			}
		},
    {
      "type": "actions",
      "elements": [
        {
          "type": "button",
          "action_id": "open_modal-action",
          "text": {
            "type": "plain_text",
            "text": "Open Ticket"
          },
          "style": "primary",
          "value": `${ticket.id}`
        },
        {
          "type": "button",
          "action_id": "close_ticket-action",
          "text": {
            "type": "plain_text",
            "text": "Complete Ticket"
          },
          "style": "danger",
          "value": `${ticket.id}`
        },
      ]
    },
  ];
  await app.client.chat.postMessage({
    channel: channel,
    text: `${ticket.id}`,
    blocks: blocks,
  });
}

export default app;