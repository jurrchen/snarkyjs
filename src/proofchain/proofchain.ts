import {
  SelfProof,
  Field,
  Proof,
  Experimental,
  verify,
  isReady,
  provablePure,
  Struct,
  Circuit,
  MerkleWitness,
  MerkleTree,
  Poseidon,
} from 'snarkyjs';

await isReady;

class ProofchainStruct extends Struct({
  rootCommit: Field,
  messagesCommit: Field
}) {}

const Proofchain = Experimental.ZkProgram({
  publicInput: provablePure(ProofchainStruct),

  methods: {
    init: {
      privateInputs: [Field],
      method(publicInput: ProofchainStruct, rootKey: Field) {
        publicInput.messagesCommit.assertEquals(Field(0));
        publicInput.rootCommit.assertEquals(Poseidon.hash([
          rootKey
        ]));
      },
    },

    // addRootMessage
    addUser: {
      privateInputs: [SelfProof, Field],

      method(publicInput: ProofchainStruct, self: SelfProof<ProofchainStruct>, signerKey: Field) {
        self.verify();

        publicInput.rootCommit.assertEquals(self.publicInput.rootCommit)
        publicInput.messagesCommit.assertEquals(self.publicInput.messagesCommit)
      }
    },

    addMessage: {
      privateInputs: [SelfProof, Field],

      // proof.append is the only one that needs to be secured
      // proof.verify(message state) << commitment is secure, we do other operations outside

      // To append, we can use a blockchain style hashing mechanism      
      method(publicInput: ProofchainStruct, self: SelfProof<ProofchainStruct>, message: Field) {
        self.verify();

        // assert self and publicInput are equal in all other ways
        publicInput.rootCommit.assertEquals(self.publicInput.rootCommit)

        publicInput.messagesCommit.assertEquals(
          Poseidon.hash([self.publicInput.messagesCommit, message]),
          'Message commit invalid'
        )
      }
    }
  }
});


// Full on encryption (!!)
// https://docs.minaprotocol.com/zkapps/snarkyjs-reference/modules/Encryption
// Do we need to do this in the proof?
// https://github.com/search?q=Encryption+snarkyjs&type=code

console.time('compiling 1');
await Proofchain.compile();
console.timeEnd('compiling 1');

const rootKey = Field(12345)
const rootCommit = Poseidon.hash([
  rootKey
])

console.time('proving base case...');
const proof = await Proofchain.init({
  rootCommit,
  messagesCommit: Field(0),
}, rootKey);
console.timeEnd('proving base case...');

const commit1 = Poseidon.hash([
  Field(0),
  Field(12345),
]);

console.time('adding message 12345');
const proof2 = await Proofchain.addMessage({
  rootCommit,
  messagesCommit: commit1
}, proof, Field(12345))
console.timeEnd('adding message 12345');

const commit2 = Poseidon.hash([
  commit1,
  Field(23456),
]);

console.time('adding message 23456');
const proof3 = await Proofchain.addMessage({
  rootCommit,
  messagesCommit: commit2
}, proof2, Field(23456));
console.timeEnd('adding message 23456');
