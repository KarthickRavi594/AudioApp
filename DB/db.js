module.exports = {

    async getAudioList(dbConnect){
        console.log('dbconnect', dbConnect)
        return await dbConnect.collection('audio').find({}).toArray();
    }
}
