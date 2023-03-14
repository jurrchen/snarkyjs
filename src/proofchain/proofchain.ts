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
  signersCommit: Field,
  messagesCommit: Field
}) {}


const MERKLE_HEIGHT = 12;
class MyMerkleWitness extends MerkleWitness(MERKLE_HEIGHT) {}

class SignerStruct extends Struct({
  signerKey: Field,
  ringCommit: Field
}) {}

const SignerProgram = Experimental.ZkProgram({
  publicInput: provablePure(SignerStruct),

  methods: {
    init: {
      privateInputs: [MyMerkleWitness],

      method(publicInput: SignerStruct, witness: MyMerkleWitness) {
        publicInput.ringCommit.assertEquals(
          witness.calculateRoot(publicInput.signerKey)
        )
      }
    }
  }
});

const Proofchain = Experimental.ZkProgram({
  publicInput: provablePure(ProofchainStruct),

  methods: {
    init: {
      privateInputs: [Field],

      method(publicInput: ProofchainStruct, rootKey: Field) {
        publicInput.messagesCommit.assertEquals(Field(0));
        publicInput.signersCommit.assertEquals(Field(0));
        publicInput.rootCommit.assertEquals(Poseidon.hash([
          rootKey
        ]));
      },
    },

    // addRootMessage

    setUsers: {
      privateInputs: [SelfProof, Field, Field],

      method(publicInput: ProofchainStruct, self: SelfProof<ProofchainStruct>, rootKey: Field, signersCommit: Field) {
        self.verify();

        publicInput.messagesCommit.assertEquals(Field(0))
        
        publicInput.rootCommit.assertEquals(Poseidon.hash([
          rootKey
        ]));
        publicInput.rootCommit.assertEquals(self.publicInput.rootCommit)
        publicInput.messagesCommit.assertEquals(self.publicInput.messagesCommit)

        publicInput.signersCommit.assertEquals(signersCommit)
      }
    },

    addMessage: {
      privateInputs: [SelfProof, Field, Field, MyMerkleWitness],

      // proof.append is the only one that needs to be secured
      // proof.verify(message state) << commitment is secure, we do other operations outside

      // To append, we can use a blockchain style hashing mechanism      
      method(publicInput: ProofchainStruct, self: SelfProof<ProofchainStruct>, message: Field, signerKey: Field, witness: MyMerkleWitness) {
        self.verify();

        // assert self and publicInput are equal in all other ways
        publicInput.rootCommit.assertEquals(self.publicInput.rootCommit)
        publicInput.signersCommit.assertEquals(self.publicInput.signersCommit)

        // valid signer (was thinking of breaking this off, but actually less efficient)
        publicInput.signersCommit.assertEquals(
          witness.calculateRoot(signerKey),
          'signerKey invalid'
        )

        // message increment >> move this out
        publicInput.messagesCommit.assertEquals(
          Poseidon.hash([self.publicInput.messagesCommit, message]),
          'Message commit invalid'
        )
      }
    }
  }
});

const signerKey1 = Field(123)
const signerKey2 = Field(124)

const tree = new MerkleTree(MERKLE_HEIGHT);
tree.setLeaf(0n, signerKey1)
tree.setLeaf(1n, signerKey2)

const signersCommit = tree.getRoot();

const signer1Witness = tree.getWitness(0n);
const signer1WitnessC = new MyMerkleWitness(signer1Witness)

const signer2Witness = tree.getWitness(1n);
const signer2WitnessC = new MyMerkleWitness(signer2Witness)

/**
 * Initialize
 */
console.time('compiling 1');
// await SignerProgram.compile();
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
  signersCommit: Field(0),
}, rootKey);
console.timeEnd('proving base case...');

console.time('setting users...');
const proof1 = await Proofchain.setUsers({
  rootCommit,
  messagesCommit: Field(0),
  signersCommit,
}, proof, rootKey, signersCommit);
console.timeEnd('setting users...');

/**
 * Messages
 */
const message1 = Field(12345)
const message2 = Field(23456)

const commit1 = Poseidon.hash([
  Field(0),
  message1,
]);

console.time('adding message 1');
const proof2 = await Proofchain.addMessage({
  rootCommit,
  messagesCommit: commit1,
  signersCommit,
}, proof1, message1, signerKey1, signer1WitnessC)
console.timeEnd('adding message 1');

const commit2 = Poseidon.hash([
  commit1,
  message2,
]);

console.time('adding message 2');
const proof3 = await Proofchain.addMessage({
  rootCommit,
  messagesCommit: commit2,
  signersCommit,
}, proof2, message2, signerKey2, signer2WitnessC);
console.timeEnd('adding message 2');
