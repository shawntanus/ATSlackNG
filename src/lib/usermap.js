import { usermap } from '../config.js';

export const slack2at = (slackuser) => {
    let user = usermap.filter(x => x.slackuser == slackuser);
    if(user.length>0)
        return user[0].atuser;
    return null;
};

export const at2slack = (atuser) => {
    let user = usermap.filter(x => x.atuser == atuser);
    if(user.length>0){
        return user[0].slackuser;
    }
    return null;
};