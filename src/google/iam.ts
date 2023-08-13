import * as fs from 'fs';
import { GoogleAuth } from 'google-auth-library';
import { google, iam_v1 } from 'googleapis';

const iam = google.iam('v1');

export const getRoles = async (): Promise<iam_v1.Schema$Role[]> => {

    // Use API Key if provided, otherwise Application Default Credentials
    const auth: string | GoogleAuth = process.env.API_KEY ?? new google.auth.GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/iam']
    });

    const request: iam_v1.Params$Resource$Roles$List = {
        auth: auth,
        view: 'FULL',
    };

    let response;
    const result: iam_v1.Schema$Role[] = [];
    do {
        if (response && response.nextPageToken) {
            request.pageToken = response.nextPageToken;
        }
        response = (await iam.roles.list(request)).data;
        const rolesPage = response.roles;
        if (rolesPage) {
            result.push(...rolesPage);
        }
    } while (response.nextPageToken);

    return result;
};

export const saveRoles = async (): Promise<void> => {
    const roles = await getRoles();

    try {
        fs.writeFileSync('src/google/data/roles.json', JSON.stringify(roles, null, 2));
    } catch (err) {
        console.error(err);
    }
};

export default getRoles;